import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { VideoFeedItem } from "@/components/video-feed-item";
import { goToUserProfile } from "@/lib/profile-navigation";
import { type FeedVideo, getFeedVideoById } from "@/services/videos";

/** Bare player, for videos we don't have full Feed data for (no videoId passed). */
function BarePlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });

  useFocusEffect(
    useCallback(() => {
      player.play();
    }, [player])
  );

  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />;
}

export default function WatchVideoScreen() {
  const { url, videoId, showComments, actorId, actorName, actorAvatar, actorIcon } = useLocalSearchParams<{
    url: string;
    videoId?: string;
    ownerId?: string;
    showComments?: string;
    actorId?: string;
    actorName?: string;
    actorAvatar?: string;
    actorIcon?: "heart" | "bookmark" | "repeat";
  }>();
  const { height } = useWindowDimensions();
  const [feedVideo, setFeedVideo] = useState<FeedVideo | null>(null);
  const [loading, setLoading] = useState(!!videoId);
  // Drives VideoFeedItem's active/paused state - e.g. paused while viewing the actor's
  // profile, since pushing it leaves this screen mounted underneath.
  const [videoActive, setVideoActive] = useState(true);

  useEffect(() => {
    if (!videoId) return;
    getFeedVideoById(videoId).then((video) => {
      setFeedVideo(video);
      setLoading(false);
    });
  }, [videoId]);

  useFocusEffect(
    useCallback(() => {
      setVideoActive(true);
    }, [])
  );

  return (
    <View style={styles.container}>
      {videoId ? (
        loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loading} />
        ) : feedVideo ? (
          <VideoFeedItem
            video={feedVideo}
            height={height}
            active={videoActive}
            initialShowComments={showComments === "1"}
          />
        ) : (
          <BarePlayer url={url} />
        )
      ) : (
        <BarePlayer url={url} />
      )}
      <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>
      {actorId ? (
        <Pressable
          style={styles.likerPill}
          onPress={() => {
            // Pushing the profile leaves this screen mounted underneath, so its audio
            // would otherwise keep playing behind the profile view.
            setVideoActive(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { flex: 1 },
  loading: { flex: 1 },
  closeButton: { position: "absolute", top: 50, left: 16, zIndex: 1 },
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
    zIndex: 1,
  },
  likerName: { color: "#fff", fontWeight: "700", fontSize: 13, flexShrink: 1 },
});
