import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import type { Profile, Video } from "@/lib/database.types";
import { signOut } from "@/services/auth";
import { getOwnProfile } from "@/services/profiles";
import { getOwnVideos } from "@/services/videos";

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  professional: "Professional",
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload every time the tab regains focus, so edits/new videos show up immediately.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([getOwnProfile(), getOwnVideos()]).then(([profileData, videosData]) => {
        if (isActive) {
          setProfile(profileData);
          setVideos(videosData);
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

        <View style={styles.buttonRow}>
          <Pressable style={styles.editButton} onPress={() => router.push("/(tabs)/profile/edit")}>
            <Text style={styles.editButtonText}>Edit profile</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={() => signOut()}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        {!isOrganizer && (
          <>
            <Pressable
              style={styles.addVideoButton}
              onPress={() => router.push("/(tabs)/profile/new-video")}
            >
              <Ionicons name="add-circle" size={26} color="#093A7D" />
              <Text style={styles.addVideoText}>Add new video</Text>
            </Pressable>
            <Text style={styles.addVideoSubtitle}>Post your dance videos and connect with dancers worldwide!</Text>

            {videos.length > 0 ? (
              <Text style={styles.videosHeading}>Your videos</Text>
            ) : null}

            {videos.map((video) => (
              <Pressable
                key={video.id}
                style={styles.videoCard}
                onPress={() => router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}`)}
              >
                <View style={styles.videoThumb}>
                  {video.thumbnail_url ? (
                    <Image source={{ uri: video.thumbnail_url }} style={styles.videoThumbImage} contentFit="cover" />
                  ) : null}
                  <View style={styles.videoThumbPlayBadge}>
                    <Ionicons name="play" size={16} color="#fff" />
                  </View>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={1}>
                    {video.description}
                  </Text>
                  {video.dance_style ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>#{video.dance_style.replace(" ", "")}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.videoSong} numberOfLines={1}>
                    {video.song_title ? `🎵 ${video.song_title} · ${video.song_artist}` : "🎵 Original sound"}
                  </Text>
                  <View style={styles.videoStats}>
                    <Ionicons name="eye-outline" size={13} color="#9B7FC7" />
                    <Text style={styles.videoStatsText}>{video.views_count} views</Text>
                    <Ionicons name="heart-outline" size={13} color="#9B7FC7" style={{ marginLeft: 10 }} />
                    <Text style={styles.videoStatsText}>0 likes</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}
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
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  editButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonText: { color: "#093A7D", fontWeight: "700", fontSize: 14 },
  section: { width: "100%", marginTop: 20, alignItems: "center" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C06BE4",
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "center",
  },
  videosHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#093A7D",
    alignSelf: "flex-start",
    marginTop: 24,
  },
  sectionValue: { fontSize: 15, color: "#093A7D", lineHeight: 21, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chipText: { color: "#093A7D", fontSize: 13, fontWeight: "600" },
  addVideoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    alignSelf: "center",
  },
  addVideoText: { color: "#093A7D", fontWeight: "700", fontSize: 18 },
  addVideoSubtitle: { fontSize: 12, color: "#9B7FC7", marginTop: 4, alignSelf: "center", textAlign: "center" },
  videoCard: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginTop: 14,
    gap: 12,
  },
  videoThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  videoThumbImage: { ...StyleSheet.absoluteFillObject },
  videoThumbPlayBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoInfo: { flex: 1, justifyContent: "center", gap: 4 },
  videoSong: { fontSize: 11, color: "#9B7FC7", fontStyle: "italic" },
  videoTitle: { fontSize: 14, fontWeight: "700", color: "#093A7D" },
  videoStats: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  videoStatsText: { fontSize: 11, color: "#9B7FC7", marginLeft: 4 },
  logoutButton: {
    backgroundColor: "#093A7D",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
