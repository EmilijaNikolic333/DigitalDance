import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { ShareToSheet } from "@/components/share-to-sheet";
import { VideoCommentsSheet } from "@/components/video-comments-sheet";
import { goToUserProfile } from "@/lib/profile-navigation";

export default function WatchVideoScreen() {
  const { url, videoId, ownerId, showComments, actorId, actorName, actorAvatar, actorIcon } = useLocalSearchParams<{
    url: string;
    videoId?: string;
    ownerId?: string;
    showComments?: string;
    actorId?: string;
    actorName?: string;
    actorAvatar?: string;
    actorIcon?: "heart" | "bookmark" | "repeat";
  }>();
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  const [commentsVisible, setCommentsVisible] = useState(showComments === "1");
  const [showShare, setShowShare] = useState(false);

  // Resumes playback when this screen regains focus - e.g. coming back from the actor's
  // profile, which we explicitly paused for before navigating there.
  useFocusEffect(
    useCallback(() => {
      player.play();
    }, [player])
  );

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
      <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>
      {videoId ? (
        <Pressable onPress={() => setShowShare(true)} style={styles.shareButton} hitSlop={12}>
          <Ionicons name="paper-plane-outline" size={22} color="#fff" />
        </Pressable>
      ) : null}
      {actorId ? (
        <Pressable
          style={styles.likerPill}
          onPress={() => {
            // Pushing the profile leaves this screen mounted underneath, so its audio
            // would otherwise keep playing behind the profile view.
            player.pause();
            // actorId is always someone else - self-notifications are never created.
            goToUserProfile(actorId, null);
          }}
        >
          <Ionicons name={actorIcon ?? "heart"} size={16} color="#C06BE4" />
          <Avatar url={actorAvatar} size={26} />
          <Text style={styles.likerName} numberOfLines={1}>
            {actorName || "Unknown"}
          </Text>
        </Pressable>
      ) : null}
      {videoId ? (
        <VideoCommentsSheet
          videoId={videoId}
          visible={commentsVisible}
          onClose={() => setCommentsVisible(false)}
          onCommentAdded={() => {}}
          videoOwnerId={ownerId}
        />
      ) : null}
      {videoId ? <ShareToSheet videoId={videoId} visible={showShare} onClose={() => setShowShare(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { flex: 1 },
  closeButton: { position: "absolute", top: 50, left: 16 },
  shareButton: { position: "absolute", top: 100, left: 16 },
  likerPill: {
    position: "absolute",
    top: 50,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(9, 58, 125, 0.7)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 200,
  },
  likerName: { color: "#fff", fontWeight: "700", fontSize: 13, flexShrink: 1 },
});
