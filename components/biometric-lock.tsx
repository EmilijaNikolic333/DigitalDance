import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { authenticateWithBiometrics } from "@/services/biometrics";

interface BiometricLockProps {
  onUnlock: () => void;
  onUsePassword: () => void;
}

export function BiometricLock({ onUnlock, onUsePassword }: BiometricLockProps) {
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const tryAuthenticate = useCallback(async () => {
    setFailed(false);
    setErrorDetail(null);
    try {
      const result = await authenticateWithBiometrics();
      if (result.success) {
        onUnlock();
      } else {
        setFailed(true);
        setErrorDetail(result.error ?? null);
      }
    } catch (err) {
      setFailed(true);
      setErrorDetail(err instanceof Error ? err.message : String(err));
    }
  }, [onUnlock]);

  useEffect(() => {
    // On cold start, calling authenticateAsync immediately can silently no-op on iOS
    // because the app isn't "fully active" yet right after the splash screen dismisses.
    const timeout = setTimeout(tryAuthenticate, 500);
    return () => clearTimeout(timeout);
  }, [tryAuthenticate]);

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <View style={styles.container}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />

        <View style={styles.iconCircle}>
          <Ionicons name="keypad-outline" size={48} color="#093A7D" />
        </View>

        <Text style={styles.title}>{failed ? "Authentication failed" : "Unlock DigitalDance"}</Text>
        <Text style={styles.subtitle}>
          {failed ? "Try again, or use your password instead." : "Enter your device passcode to continue."}
        </Text>

        {errorDetail ? <Text style={styles.errorDetail}>{errorDetail}</Text> : null}

        <Pressable style={styles.button} onPress={tryAuthenticate}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>

        <Pressable onPress={onUsePassword} hitSlop={8}>
          <Text style={styles.linkText}>Use password instead</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: "100%", height: 80, marginBottom: 32 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#093A7D", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#9B7FC7", textAlign: "center", marginBottom: 12, paddingHorizontal: 24 },
  errorDetail: { fontSize: 11, color: "#D0342C", textAlign: "center", marginBottom: 16, paddingHorizontal: 24 },
  button: {
    backgroundColor: "#093A7D",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 28,
    marginBottom: 16,
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkText: { color: "#093A7D", fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
});
