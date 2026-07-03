import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { BiometricLock } from '@/components/biometric-lock';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { signOut, syncProfileNameFromMetadata } from '@/services/auth';
import { isBiometricAvailable } from '@/services/biometrics';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [needsBiometricUnlock, setNeedsBiometricUnlock] = useState(false);

  useEffect(() => {
    // A session restored on cold start belongs to a returning user -> gate it behind
    // biometrics if the device supports it. A session created via onAuthStateChange
    // (fresh login/logout during this run) already proved identity, so it's not gated.
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setIsSessionLoaded(true);
      syncProfileNameFromMetadata(data.session);

      if (data.session && (await isBiometricAvailable())) {
        setNeedsBiometricUnlock(true);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      syncProfileNameFromMetadata(newSession);
      setNeedsBiometricUnlock(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (!isSessionLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (needsBiometricUnlock) {
    return (
      <BiometricLock
        onUnlock={() => setNeedsBiometricUnlock(false)}
        onUsePassword={() => {
          setNeedsBiometricUnlock(false);
          signOut();
        }}
      />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
