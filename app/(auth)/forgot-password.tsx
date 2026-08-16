import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import { changePassword, requestPasswordReset, verifyPasswordResetCode } from "@/services/auth";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await requestPasswordReset(email.trim());
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo("We sent an 8-digit code to your email.");
    setStep("reset");
  };

  const handleResetPassword = async () => {
    setError(null);
    if (!code.trim()) {
      setError("Enter the code from your email.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: verifyError } = await verifyPasswordResetCode(email.trim(), code.trim());
    if (verifyError) {
      setLoading(false);
      setError(verifyError.message === "Token has expired or is invalid" ? "Invalid or expired code." : verifyError.message);
      return;
    }

    const { error: updateError } = await changePassword(newPassword);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // Verifying the code established a session -> root layout will switch to (tabs) automatically.
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === "email"
              ? "Enter your email and we'll send you a code."
              : "Enter the code and choose a new password."}
          </Text>

          {step === "email" ? (
            <>
              <AuthInput
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="you@email.com"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.button} onPress={handleSendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
              </Pressable>
            </>
          ) : (
            <>
              {info ? <Text style={styles.info}>{info}</Text> : null}

              <AuthInput
                label="Code"
                icon="key-outline"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="12345678"
              />
              <AuthInput
                label="New password"
                icon="lock-closed-outline"
                isPassword
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
              />
              <AuthInput
                label="Confirm password"
                icon="lock-closed-outline"
                isPassword
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.button} onPress={handleResetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset password</Text>}
              </Pressable>

              <Pressable onPress={handleSendCode} disabled={loading} style={styles.link}>
                <Text style={styles.linkText}>Didn&apos;t get a code? Resend</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={() => router.back()} style={styles.link}>
            <Text style={styles.linkText}>
              Back to <Text style={styles.linkAccent}>Login</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 28 },
  title: { fontSize: 28, fontWeight: "700", color: "#093A7D", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#C06BE4", marginBottom: 24 },
  error: { color: "#D0342C", fontSize: 13, marginBottom: 10 },
  info: { color: "#093A7D", fontSize: 13, marginBottom: 14 },
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
