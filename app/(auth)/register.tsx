import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AuthInput } from "@/components/auth-input";
import { signUp } from "@/services/auth";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDancer, setIsDancer] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!isDancer && !isOrganizer) {
      setError("Choose at least one: dancer or organizer.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await signUp(email.trim(), password, fullName.trim(), {
      isDancer,
      isOrganizer,
    });
    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("already registered")
          ? "An account with this email already exists."
          : signUpError.message
      );
      return;
    }

    if (data?.session) {
      router.replace("/(tabs)/profile");
    } else {
      setInfo("Account created! Check your email to confirm your account, then log in.");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Create your account.</Text>

          <AuthInput
            label="Name"
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
          />
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
          <AuthInput
            label="Confirm password"
            icon="lock-closed-outline"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
          />

          <Text style={styles.roleLabel}>I am a... (choose one or both)</Text>
          <View style={styles.roleRow}>
            <Pressable style={styles.roleOption} onPress={() => setIsDancer((v) => !v)}>
              <Ionicons
                name={isDancer ? "checkbox" : "square-outline"}
                size={20}
                color="#093A7D"
              />
              <Text style={styles.roleOptionText}>Dancer</Text>
            </Pressable>
            <Pressable style={styles.roleOption} onPress={() => setIsOrganizer((v) => !v)}>
              <Ionicons
                name={isOrganizer ? "checkbox" : "square-outline"}
                size={20}
                color="#093A7D"
              />
              <Text style={styles.roleOptionText}>Organizer</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
          </Pressable>

          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkAccent}>Login</Text>
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
  roleLabel: { fontSize: 13, fontWeight: "600", color: "#093A7D", marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 20, marginBottom: 16 },
  roleOption: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleOptionText: { color: "#093A7D", fontSize: 14, fontWeight: "600" },
  error: { color: "#D0342C", fontSize: 13, marginBottom: 10 },
  info: { color: "#093A7D", fontSize: 13, marginBottom: 10 },
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
