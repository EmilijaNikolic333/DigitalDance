import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export default function RegisterScreen() {
  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>Registracija</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Već imaš nalog? Prijavi se
        </Link>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 32, fontWeight: "bold", color: "#093A7D", marginBottom: 20 },
  link: { color: "#093A7D", textDecorationLine: "underline" },
});
