import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function OnboardingScreen() {
  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <View style={styles.container}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />

        <Image
          source={require("@/assets/images/onboarding-dancer.png")}
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

const styles = StyleSheet.create({
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
    backgroundColor: "#093A7D",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 28,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
