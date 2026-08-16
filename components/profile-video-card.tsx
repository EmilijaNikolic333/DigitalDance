import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { ShareToSheet } from "@/components/share-to-sheet";
import { useRepostContext } from "@/contexts/repost-context";
import { useSavedContext } from "@/contexts/saved-context";
import type { Video } from "@/lib/database.types";
import { goToUserProfile } from "@/lib/profile-navigation";
import { supabase } from "@/lib/supabase";
import { toggleRepostVideo } from "@/services/reposted-videos";
import { toggleSaveVideo } from "@/services/saved-videos";

interface ProfileVideoCardProps {
  video: Video & { likesCount: number; commentsCount: number; isSaved?: boolean; isReposted?: boolean };
  onPress: () => void;
  /** Omit for videos you don't own - hides the edit pencil. */
  onEditPress?: () => void;
  /** Shows a bookmark toggle in the cover - for videos you don't own. */
  showSaveButton?: boolean;
  /** Shows a repost toggle in the cover, below the save button - for videos you don't own. */
  showRepostButton?: boolean;
  /** Shown as a byline - for videos that aren't necessarily yours (e.g. the Saved tab). */
  authorName?: string;
  /** Author's id/avatar - shown next to authorName, tappable to open their profile. */
  authorId?: string;
  authorAvatar?: string | null;
}

/**
 * A compact, thumbnail-first preview - likes/comments/song details live on the full Feed-style
 * watch screen (opened by tapping the card), not here.
 */
export function ProfileVideoCard({
  video,
  onPress,
  onEditPress,
  showSaveButton,
  showRepostButton,
  authorName,
  authorId,
  authorAvatar,
}: ProfileVideoCardProps) {
  const [showShare, setShowShare] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isVideoReposted, setVideoReposted } = useRepostContext();
  const reposted = isVideoReposted(video.id, video.isReposted ?? false);
  const { isVideoSaved, setVideoSaved } = useSavedContext();
  const saved = isVideoSaved(video.id, video.isSaved ?? false);

  useEffect(() => {
    if (!authorId) return;
    supabase.auth.getSession().then(({ data }) => setCurrentUserId(data.session?.user?.id ?? null));
  }, [authorId]);

  const handleToggleSave = async () => {
    const nextSaved = !saved;
    setVideoSaved(video.id, nextSaved);

    const { saved: confirmedSaved, error } = await toggleSaveVideo(video.id, video.user_id);
    if (error) {
      setVideoSaved(video.id, !nextSaved);
      return;
    }
    setVideoSaved(video.id, confirmedSaved);
  };

  const handleToggleRepost = async () => {
    const nextReposted = !reposted;
    setVideoReposted(video.id, nextReposted);

    const { reposted: confirmedReposted, error } = await toggleRepostVideo(video.id, video.user_id);
    if (error) {
      setVideoReposted(video.id, !nextReposted);
      return;
    }
    setVideoReposted(video.id, confirmedReposted);
  };

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
        <View style={styles.coverActionColumn}>
          {showSaveButton ? (
            <Pressable style={styles.coverActionButton} onPress={handleToggleSave} hitSlop={8}>
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={16}
                color={saved ? "#C06BE4" : "#093A7D"}
              />
            </Pressable>
          ) : null}
          {showRepostButton ? (
            <Pressable style={styles.coverActionButton} onPress={handleToggleRepost} hitSlop={8}>
              <Ionicons name="repeat" size={16} color={reposted ? "#C06BE4" : "#093A7D"} />
            </Pressable>
          ) : null}
          <Pressable style={styles.coverActionButton} onPress={() => setShowShare(true)} hitSlop={8}>
            <Ionicons name="paper-plane-outline" size={16} color="#093A7D" />
          </Pressable>
        </View>
      </View>

      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={1}>
          {video.description}
        </Text>
        {authorName ? (
          authorId ? (
            <Pressable
              style={styles.authorRow}
              onPress={() => goToUserProfile(authorId, currentUserId)}
              hitSlop={4}
            >
              <Avatar url={authorAvatar} size={18} />
              <Text style={styles.videoAuthor} numberOfLines={1}>
                by {authorName}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.videoAuthor} numberOfLines={1}>
              by {authorName}
            </Text>
          )
        ) : null}
        {video.dance_style ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>#{video.dance_style.replace(" ", "")}</Text>
          </View>
        ) : null}
      </View>

      <ShareToSheet videoId={video.id} visible={showShare} onClose={() => setShowShare(false)} />
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
  coverActionColumn: { position: "absolute", top: 10, left: 10, gap: 8 },
  coverActionButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  videoInfo: { padding: 12, gap: 4 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  videoAuthor: { fontSize: 11, color: "#9B7FC7", fontWeight: "700" },
  videoTitle: { fontSize: 14, fontWeight: "700", color: "#093A7D" },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "#F8ECFF",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  chipText: { color: "#093A7D", fontSize: 12, fontWeight: "700" },
});
