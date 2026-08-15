import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProfileVideoCard } from "@/components/profile-video-card";
import { useRepostContext } from "@/contexts/repost-context";
import { getRepostedVideos, type RepostedVideoItem } from "@/services/reposted-videos";

export default function AllRepostedVideosScreen() {
  const [videos, setVideos] = useState<RepostedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only show the full spinner on the very first load - refocus refreshes shouldn't blank out
  // the list (and reset its scroll position) while already-loaded content is on screen.
  const hasLoadedRef = useRef(false);
  const { isVideoReposted } = useRepostContext();

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    getRepostedVideos().then(({ data, error: loadError }) => {
      setVideos(data);
      setError(loadError ?? null);
      setLoading(false);
      hasLoadedRef.current = true;
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

        <Text style={styles.title}>Reposted videos</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>Couldn&apos;t load your reposted videos. Check your connection.</Text>
            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : videos.filter((v) => isVideoReposted(v.id, true)).length === 0 ? (
          <Text style={styles.emptyText}>You haven&apos;t reposted any videos yet.</Text>
        ) : (
          <View style={styles.list}>
            {videos
              .filter((video) => isVideoReposted(video.id, true))
              .map((video) => (
                <ProfileVideoCard
                  key={video.id}
                  video={video}
                  onPress={() => router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}`)}
                  authorName={video.author?.full_name ?? undefined}
                  authorId={video.author?.id}
                  authorAvatar={video.author?.avatar_url}
                  showSaveButton
                  showRepostButton
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
