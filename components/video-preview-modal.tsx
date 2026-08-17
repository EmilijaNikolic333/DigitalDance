import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import type { Song } from "@/services/music";

interface VideoPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  videoUri: string;
  song: Song | null;
}

/** Full-screen playback of a not-yet-posted video, muting its own audio and
 * syncing the chosen song on top of it the same way the feed does - lets you
 * check a recording sounds right before filling in the rest of the form. */
export function VideoPreviewModal({ visible, onClose, videoUri, song }: VideoPreviewModalProps) {
  const hasSong = !!song;

  const player = useVideoPlayer(visible ? videoUri : null, (p) => {
    p.loop = true;
    if (hasSong) p.muted = true;
  });

  const songPlayer = useVideoPlayer(visible && hasSong ? (song?.previewUrl ?? null) : null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!hasSong) return;
    const subscription = player.addListener("playToEnd", () => {
      songPlayer.currentTime = 0;
      songPlayer.play();
    });
    return () => subscription.remove();
  }, [player, songPlayer, hasSong]);

  useEffect(() => {
    if (visible) {
      player.play();
      if (hasSong) songPlayer.play();
    }
  }, [visible, player, songPlayer, hasSong]);

  if (!visible) return null;

  return (
    <Modal visible animationType="fade">
      <View style={styles.container}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  closeButton: { position: "absolute", top: 50, left: 16, zIndex: 10 },
});
