import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { VideoCommentsSheet } from "@/components/video-comments-sheet";
import { VideoLikesSheet } from "@/components/video-likes-sheet";
import type { Video } from "@/lib/database.types";

interface ProfileVideoCardProps {
  video: Video & { likesCount: number; commentsCount: number };
  onPress: () => void;
  /** Omit for videos you don't own - hides the edit pencil. */
  onEditPress?: () => void;
}

export function ProfileVideoCard({ video, onPress, onEditPress }: ProfileVideoCardProps) {
  const [commentsCount, setCommentsCount] = useState(video.commentsCount);
  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  return (
    <Pressable style={styles.videoCard} onPress={onPress}>
      <View style={styles.cover}>
        {video.thumbnail_url ? (
          <Image source={{ uri: video.thumbnail_url }} style={styles.coverImage} contentFit="cover" />
        ) : null}
        <View style={styles.coverPlayBadge}>
          <Ionicons name="play" size={20} color="#fff" />
        </View>
        {onEditPress ? (
          <Pressable style={styles.editVideoButton} onPress={onEditPress} hitSlop={8}>
            <Ionicons name="pencil" size={16} color="#093A7D" />
          </Pressable>
        ) : null}
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
          <View style={styles.statRow}>
            <Ionicons name="eye-outline" size={13} color="#9B7FC7" />
            <Text style={styles.videoStatsText}>{video.views_count} views</Text>
          </View>

          <Pressable style={styles.statRow} onPress={() => setShowLikers(true)} hitSlop={6}>
            <Ionicons name="heart-outline" size={13} color="#9B7FC7" />
            <Text style={styles.videoStatsText}>{video.likesCount} likes</Text>
          </Pressable>

          <Pressable style={styles.statRow} onPress={() => setShowComments(true)} hitSlop={6}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color="#9B7FC7" />
            <Text style={styles.videoStatsText}>{commentsCount} comments</Text>
          </Pressable>
        </View>
      </View>

      <VideoCommentsSheet
        videoId={video.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => setCommentsCount((count) => count + 1)}
      />
      <VideoLikesSheet videoId={video.id} visible={showLikers} onClose={() => setShowLikers(false)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  videoCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 14,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: 160,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { ...StyleSheet.absoluteFillObject },
  coverPlayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  editVideoButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  videoInfo: { padding: 12, gap: 4 },
  videoSong: { fontSize: 11, color: "#9B7FC7", fontStyle: "italic" },
  videoTitle: { fontSize: 14, fontWeight: "700", color: "#093A7D" },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "#F8ECFF",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  chipText: { color: "#093A7D", fontSize: 12, fontWeight: "700" },
  videoStats: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 4, gap: 14 },
  videoStatsText: { fontSize: 11, color: "#9B7FC7", marginLeft: 4 },
  statRow: { flexDirection: "row", alignItems: "center" },
});
