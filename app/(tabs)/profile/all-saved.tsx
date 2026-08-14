import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProfileVideoCard } from "@/components/profile-video-card";
import { getSavedVideos, type SavedVideoItem } from "@/services/saved-videos";

export default function AllSavedVideosScreen() {
  const [videos, setVideos] = useState<SavedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getSavedVideos().then(({ data, error: loadError }) => {
      setVideos(data);
      setError(loadError ?? null);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>

        <Text style={styles.title}>Saved videos</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>Couldn&apos;t load your saved videos. Check your connection.</Text>
            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : videos.length === 0 ? (
          <Text style={styles.emptyText}>You haven&apos;t saved any videos yet.</Text>
        ) : (
          <View style={styles.list}>
            {videos.map((video) => (
              <ProfileVideoCard
                key={video.id}
                video={video}
                onPress={() => router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}`)}
                authorName={video.author?.full_name ?? undefined}
                showSaveButton
                onUnsaved={() => setVideos((current) => current.filter((v) => v.id !== video.id))}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
  closeButton: { position: "absolute", top: 16, left: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#093A7D", marginBottom: 8 },
  list: { width: "100%" },
  errorBox: { alignItems: "center", marginTop: 40 },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center" },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#093A7D",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
