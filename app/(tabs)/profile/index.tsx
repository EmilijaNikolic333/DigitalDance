import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import type { Profile } from "@/lib/database.types";
import { signOut } from "@/services/auth";
import { getOwnProfile } from "@/services/profiles";

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  professional: "Professional",
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Reload every time the tab regains focus, so edits made on the edit screen show up immediately.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      getOwnProfile().then((data) => {
        if (isActive) {
          setProfile(data);
          setLoading(false);
        }
      });
      return () => {
        isActive = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#093A7D" />
        </View>
      </LinearGradient>
    );
  }

  const isOrganizer = profile?.role === "organizer";

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />

        <LinearGradient colors={["#093A7D", "#C06BE4"]} style={styles.avatarRing}>
          <View style={styles.avatarGap}>
            <Avatar url={profile?.avatar_url} size={100} />
          </View>
        </LinearGradient>

        <Text style={styles.name}>{profile?.full_name || "Add your name"}</Text>

        {!isOrganizer && profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {profile?.city ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color="#C06BE4" />
            <Text style={styles.rowText}>{profile.city}</Text>
          </View>
        ) : null}

        <Pressable style={styles.editButton} onPress={() => router.push("/(tabs)/profile/edit")}>
          <Text style={styles.editButtonText}>Edit profile</Text>
        </Pressable>

        {isOrganizer ? (
          <>
            {profile?.organization_name ? <InfoBlock label="Organization" value={profile.organization_name} /> : null}
            {profile?.website ? <InfoBlock label="Website" value={profile.website} /> : null}
            {profile?.about ? <InfoBlock label="About" value={profile.about} /> : null}
          </>
        ) : (
          <>
            {profile?.dance_styles && profile.dance_styles.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Dance styles</Text>
                <View style={styles.chipRow}>
                  {profile.dance_styles.map((style) => (
                    <View key={style} style={styles.chip}>
                      <Text style={styles.chipText}>{style}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {profile?.experience_level ? (
              <InfoBlock label="Experience" value={EXPERIENCE_LABEL[profile.experience_level]} />
            ) : null}
            {profile?.availability ? <InfoBlock label="Availability" value={profile.availability} /> : null}
          </>
        )}

        <Pressable style={styles.logoutButton} onPress={() => signOut()}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 40, paddingBottom: 40 },
  logo: { width: "100%", height: 80, marginBottom: 16 },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  avatarGap: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: "#F8ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginTop: 16 },
  bio: { fontSize: 14, color: "#093A7D", textAlign: "center", marginTop: 6, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  rowText: { fontSize: 13, color: "#C06BE4", fontWeight: "600" },
  editButton: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonText: { color: "#093A7D", fontWeight: "700", fontSize: 14 },
  section: { width: "100%", marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#C06BE4", textTransform: "uppercase", marginBottom: 6 },
  sectionValue: { fontSize: 15, color: "#093A7D", lineHeight: 21 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chipText: { color: "#093A7D", fontSize: 13, fontWeight: "600" },
  logoutButton: {
    marginTop: 32,
    backgroundColor: "#093A7D",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
