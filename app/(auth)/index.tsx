import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";

export default function OnboardingScreen() {
  const { palette, darkMode } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <View style={styles.container}>
        <Image
          source={darkMode ? require("@/assets/images/icon-dark.png") : require("@/assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />

        <Image
          source={
            darkMode
              ? require("@/assets/images/onboarding-dancer-dark.png")
              : require("@/assets/images/onboarding-dancer.png")
          }
          style={styles.dancer}
          contentFit="contain"
        />

        <Pressable style={styles.button} onPress={() => router.push("/(auth)/register")}>
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    logo: {
      width: "100%",
      height: 110,
      marginBottom: 8,
    },
    dancer: {
      width: "100%",
      height: 420,
      marginBottom: 24,
    },
    button: {
      backgroundColor: p.buttonBg,
      paddingVertical: 14,
      paddingHorizontal: 48,
      borderRadius: 28,
    },
    buttonText: { color: p.buttonText, fontWeight: "700", fontSize: 16 },
  });
}
