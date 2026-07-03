import { Ionicons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import type { FeedVideo } from "@/services/videos";
import { incrementViewCount } from "@/services/videos";

interface VideoFeedItemProps {
  video: FeedVideo;
  height: number;
  active: boolean;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VideoFeedItem({ video, height, active }: VideoFeedItemProps) {
  const [muted, setMuted] = useState(false);
  const [displayedViews, setDisplayedViews] = useState(video.views_count);
  const [expanded, setExpanded] = useState(false);

  const player = useVideoPlayer(video.video_url, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.5;
  });

  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: player.bufferedPosition,
  });

  useEffect(() => {
    if (active) {
      player.play();
      // Counts as a fresh view every time this video becomes the active/visible one
      // again (scroll away and back), not just the first time it's ever seen.
      setDisplayedViews((v) => v + 1);
      incrementViewCount(video.id);
    } else {
      player.pause();
    }
  }, [active, player, video.id]);

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const toggleMute = () => {
    player.muted = !player.muted;
    setMuted(player.muted);
  };

  const progress = player.duration > 0 ? currentTime / player.duration : 0;

  return (
    <View style={[styles.container, { height }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePlayback}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      </Pressable>

      {!isPlaying ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play" size={56} color="rgba(255,255,255,0.9)" />
        </View>
      ) : null}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      <View style={styles.rightRail}>
        <Avatar url={video.author?.avatar_url} size={46} />
        <View style={styles.statItem}>
          <Ionicons name="eye" size={22} color="#fff" />
          <Text style={styles.statText}>{displayedViews}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={22} color="#fff" />
          <Text style={styles.statText}>0</Text>
        </View>
      </View>

      <View style={styles.bottomInfo}>
        <Pressable onPress={() => setExpanded((e) => !e)}>
          <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>
            {video.description || video.title}
          </Text>
          {!expanded && (video.description?.length ?? 0) > 30 ? (
            <Text style={styles.moreText}>more</Text>
          ) : null}
        </Pressable>
        <Text style={styles.author}>{video.author?.full_name || "Unknown"}</Text>
        {video.dance_style ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>#{video.dance_style.replace(" ", "")}</Text>
          </View>
        ) : null}
        <View style={styles.songRow}>
          <Ionicons name="musical-notes" size={13} color="#fff" />
          <Text style={styles.songText} numberOfLines={1}>
            {video.song_title ? `${video.song_title} - ${video.song_artist}` : "Original sound"}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <Pressable onPress={toggleMute} hitSlop={8}>
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="#fff" />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
        </View>
        <Text style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(player.duration)}
        </Text>
      </View>
    </View>
  );
}

const TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.6)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

const styles = StyleSheet.create({
  container: { width: "100%", backgroundColor: "#000" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  rightRail: {
    position: "absolute",
    right: 12,
    bottom: 120,
    alignItems: "center",
    gap: 18,
  },
  statItem: { alignItems: "center", gap: 2 },
  statText: { color: "#fff", fontSize: 13, fontWeight: "800", ...TEXT_SHADOW },
  bottomInfo: { position: "absolute", left: 16, right: 90, bottom: 70 },
  title: { color: "#fff", fontSize: 17, fontWeight: "800", ...TEXT_SHADOW },
  moreText: { color: "#fff", fontSize: 13, fontWeight: "700", opacity: 0.85, marginTop: 2, ...TEXT_SHADOW },
  author: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 4, ...TEXT_SHADOW },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  chipText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  songRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  songText: { color: "#fff", fontSize: 13, fontWeight: "600", flexShrink: 1, ...TEXT_SHADOW },
  progressRow: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#C06BE4" },
  timeText: { color: "#fff", fontSize: 11, fontWeight: "700", ...TEXT_SHADOW },
});
