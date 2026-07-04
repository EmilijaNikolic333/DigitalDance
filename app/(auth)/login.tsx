import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

import { AuthInput } from "@/components/auth-input";
import { signIn } from "@/services/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : signInError.message
      );
    }
    // A successful login updates the auth session -> root layout automatically switches to (tabs)
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Login to continue.</Text>

          <AuthInput
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@email.com"
          />
          <AuthInput
            label="Password"
            icon="lock-closed-outline"
            isPassword
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </Pressable>

          <Link href="/(auth)/register" style={styles.link}>
            <Text style={styles.linkText}>
              Don&apos;t have an account? <Text style={styles.linkAccent}>Sign up</Text>
            </Text>
          </Link>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 28 },
  logo: {
    width: "100%",
    height: 110,
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#093A7D", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#C06BE4", marginBottom: 24 },
  error: { color: "#D0342C", fontSize: 13, marginBottom: 10 },
  button: {
    backgroundColor: "#093A7D",
    paddingVertical: 15,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { marginTop: 18, alignSelf: "center" },
  linkText: { color: "#093A7D", fontSize: 13 },
  linkAccent: { color: "#C06BE4", fontWeight: "700" },
});
