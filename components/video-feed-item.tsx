import { Ionicons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { FollowBadge } from "@/components/follow-badge";
import { VideoCommentsSheet } from "@/components/video-comments-sheet";
import { toggleFollow } from "@/services/follows";
import { toggleLike } from "@/services/likes";
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
  const [liked, setLiked] = useState(video.isLiked);
  const [likesCount, setLikesCount] = useState(video.likesCount);
  const [commentsCount, setCommentsCount] = useState(video.commentsCount);
  const [showComments, setShowComments] = useState(false);
  const [followingAuthor, setFollowingAuthor] = useState(video.isFollowingAuthor);

  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

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

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((count) => count + (nextLiked ? 1 : -1));

    const { liked: confirmedLiked, error } = await toggleLike(video.id);
    if (error) {
      // Revert the optimistic update if the request didn't actually go through.
      setLiked(!nextLiked);
      setLikesCount((count) => count + (nextLiked ? -1 : 1));
      return;
    }
    setLiked(confirmedLiked);
  };

  const handleToggleFollow = async () => {
    if (!video.author) return;

    const nextFollowing = !followingAuthor;
    setFollowingAuthor(nextFollowing);

    const { following: confirmedFollowing, error } = await toggleFollow(video.author.id);
    if (error) {
      setFollowingAuthor(!nextFollowing);
      return;
    }
    setFollowingAuthor(confirmedFollowing);
  };

  const playHeartBurst = () => {
    heartScale.setValue(0.3);
    heartOpacity.setValue(1);
    Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    Animated.timing(heartOpacity, {
      toValue: 0,
      duration: 250,
      delay: 350,
      useNativeDriver: true,
    }).start();
  };

  const handleVideoPress = () => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      // Second tap arrived in time - it's a double tap, so cancel the pending
      // play/pause from the first tap and just like the video instead.
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      playHeartBurst();
      if (!liked) handleToggleLike();
      return;
    }

    lastTapRef.current = now;
    tapTimeoutRef.current = setTimeout(() => {
      togglePlayback();
      tapTimeoutRef.current = null;
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const progress = player.duration > 0 ? currentTime / player.duration : 0;

  return (
    <View style={[styles.container, { height }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleVideoPress}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      </Pressable>

      {!isPlaying ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play" size={56} color="rgba(255,255,255,0.9)" />
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.heartBurst,
          { opacity: heartOpacity, transform: [{ scale: heartScale }] },
        ]}
      >
        <Ionicons name="heart" size={120} color="#C06BE4" />
      </Animated.View>

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      <View style={styles.rightRail}>
        <View style={styles.avatarWrap}>
          <Pressable
            onPress={() => video.author && router.push({ pathname: "/user/[id]", params: { id: video.author.id } })}
            hitSlop={8}
          >
            <Avatar url={video.author?.avatar_url} size={46} />
          </Pressable>
          {video.author && !followingAuthor && !video.isOwnVideo ? (
            <FollowBadge onPress={handleToggleFollow} />
          ) : null}
        </View>
        <View style={styles.statItem}>
          <Ionicons name="eye" size={22} color="#fff" />
          <Text style={styles.statText}>{displayedViews}</Text>
        </View>
        <Pressable style={styles.statItem} onPress={handleToggleLike} hitSlop={8}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#C06BE4" : "#fff"} />
          <Text style={styles.statText}>{likesCount}</Text>
        </Pressable>
        <Pressable style={styles.statItem} onPress={() => setShowComments(true)} hitSlop={8}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          <Text style={styles.statText}>{commentsCount}</Text>
        </Pressable>
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
        <Pressable
          onPress={() => video.author && router.push({ pathname: "/user/[id]", params: { id: video.author.id } })}
          hitSlop={4}
        >
          <Text style={styles.author}>{video.author?.full_name || "Unknown"}</Text>
        </Pressable>
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

      <VideoCommentsSheet
        videoId={video.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => setCommentsCount((count) => count + 1)}
      />
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
  heartBurst: {
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
  avatarWrap: { width: 46, height: 46 },
  statItem: { alignItems: "center", gap: 2 },
  statText: { color: "#fff", fontSize: 13, fontWeight: "700", ...TEXT_SHADOW },
  bottomInfo: { position: "absolute", left: 16, right: 90, bottom: 70 },
  title: { color: "#fff", fontSize: 17, fontWeight: "700", ...TEXT_SHADOW },
  moreText: { color: "#fff", fontSize: 13, fontWeight: "700", opacity: 0.85, marginTop: 2, ...TEXT_SHADOW },
  author: { color: "#E3B8FF", fontSize: 14, fontWeight: "700", marginTop: 4, ...TEXT_SHADOW },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(192, 107, 228, 0.35)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  chipText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  songRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  songText: { color: "#fff", fontSize: 13, fontWeight: "700", flexShrink: 1, ...TEXT_SHADOW },
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
