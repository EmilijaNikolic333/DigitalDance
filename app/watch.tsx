import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { VideoFeedItem } from "@/components/video-feed-item";
import { type FeedVideo, getFeedVideoById } from "@/services/videos";

/** Bare player, for videos we don't have full Feed data for (no videoId passed). */
function BarePlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });

  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />;
}

export default function WatchVideoScreen() {
  const { url, videoId } = useLocalSearchParams<{ url: string; videoId?: string }>();
  const { height } = useWindowDimensions();
  const [feedVideo, setFeedVideo] = useState<FeedVideo | null>(null);
  const [loading, setLoading] = useState(!!videoId);

  useEffect(() => {
    if (!videoId) return;
    getFeedVideoById(videoId).then((video) => {
      setFeedVideo(video);
      setLoading(false);
    });
  }, [videoId]);

  return (
    <View style={styles.container}>
      {videoId ? (
        loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loading} />
        ) : feedVideo ? (
          <VideoFeedItem video={feedVideo} height={height} active />
        ) : (
          <BarePlayer url={url} />
        )
      ) : (
        <BarePlayer url={url} />
      )}
      <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { flex: 1 },
  loading: { flex: 1 },
  closeButton: { position: "absolute", top: 50, left: 16, zIndex: 1 },
});
