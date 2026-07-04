import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Video } from "@/lib/database.types";

interface ProfileVideoCardProps {
  video: Video;
  onPress: () => void;
  onEditPress: () => void;
}

export function ProfileVideoCard({ video, onPress, onEditPress }: ProfileVideoCardProps) {
  return (
    <Pressable style={styles.videoCard} onPress={onPress}>
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

      <Pressable style={styles.editVideoButton} onPress={onEditPress} hitSlop={8}>
        <Ionicons name="pencil" size={16} color="#093A7D" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "#F8ECFF",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  chipText: { color: "#093A7D", fontSize: 12, fontWeight: "600" },
  videoStats: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  videoStatsText: { fontSize: 11, color: "#9B7FC7", marginLeft: 4 },
  editVideoButton: {
    alignSelf: "flex-start",
    padding: 6,
    backgroundColor: "#F8ECFF",
    borderRadius: 14,
  },
});
