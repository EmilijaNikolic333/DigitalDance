import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import type { Profile } from "@/lib/database.types";
import { signOut } from "@/services/auth";
import { getOwnProfile } from "@/services/profiles";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnProfile().then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#093A7D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Avatar url={profile?.avatar_url} size={110} />
      <Text style={styles.title}>{profile?.full_name || "Profile"}</Text>

      <Pressable style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#093A7D", marginTop: 16 },
  button: {
    marginTop: 24,
    backgroundColor: "#093A7D",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
