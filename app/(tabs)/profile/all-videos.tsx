import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProfileVideoCard } from "@/components/profile-video-card";
import type { Video } from "@/lib/database.types";
import { getOwnVideos } from "@/services/videos";

export default function AllVideosScreen() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      getOwnVideos().then((data) => {
        if (isActive) {
          setVideos(data);
          setLoading(false);
        }
      });
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>

        <Text style={styles.title}>Your videos</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {videos.map((video) => (
              <ProfileVideoCard
                key={video.id}
                video={video}
                onPress={() => router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}`)}
                onEditPress={() => router.push(`/(tabs)/profile/edit-video?id=${video.id}`)}
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
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginBottom: 8 },
  list: { width: "100%" },
});
