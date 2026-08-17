import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useVideoPlayer } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { type Song, searchSongs } from "@/services/music";

interface CameraRecorderProps {
  visible: boolean;
  onClose: () => void;
  onRecorded: (uri: string, song: Song | null) => void;
}

const MAX_DURATION_SECONDS = 60;
const COUNTDOWN_SECONDS = 3;
const ACCENT = "#C06BE4";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Full-screen recording UI that replaces the OS camera app so a chosen song can play
 * (out loud, picked up by the mic) and an optional start countdown can run before
 * recordAsync actually begins - lets a dancer get into position and start in rhythm. */
export function CameraRecorder({ visible, onClose, onRecorded }: CameraRecorderProps) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const discardRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const songPlayer = useVideoPlayer(selectedSong?.previewUrl ?? null, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (!visible) return;
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
    // Only re-check when the sheet opens - re-running on every permission object
    // change would loop, since requesting updates the object itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!songQuery.trim()) {
      setSongResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      searchSongs(songQuery)
        .then(setSongResults)
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [songQuery]);

  const cleanupTimers = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };

  useEffect(() => cleanupTimers, []);

  const resetState = () => {
    cleanupTimers();
    setCountdown(null);
    setRecording(false);
    setElapsed(0);
    setSelectedSong(null);
    setShowSongPicker(false);
    setSongQuery("");
    setSongResults([]);
    songPlayer.pause();
  };

  const beginRecording = async () => {
    setRecording(true);
    setElapsed(0);
    if (selectedSong) {
      songPlayer.currentTime = 0;
      songPlayer.play();
    }
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    let result: { uri: string } | undefined;
    try {
      result = await cameraRef.current?.recordAsync({ maxDuration: MAX_DURATION_SECONDS });
    } catch {
      result = undefined;
    }

    cleanupTimers();
    songPlayer.pause();
    setRecording(false);

    if (discardRef.current) {
      discardRef.current = false;
      return;
    }
    if (result?.uri) {
      const song = selectedSong;
      resetState();
      onRecorded(result.uri, song);
    }
  };

  const handleRecordPress = () => {
    if (recording) {
      cameraRef.current?.stopRecording();
      return;
    }
    if (countdown !== null) {
      cleanupTimers();
      setCountdown(null);
      return;
    }
    if (timerEnabled) {
      setCountdown(COUNTDOWN_SECONDS);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c === null) return null;
          if (c <= 1) {
            cleanupTimers();
            beginRecording();
            return null;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      beginRecording();
    }
  };

  const handleClose = () => {
    if (recording) {
      discardRef.current = true;
      cameraRef.current?.stopRecording();
    }
    resetState();
    onClose();
  };

  if (!visible) return null;

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <Modal visible animationType="slide">
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#fff" />
          <Text style={styles.permissionText}>Camera and microphone access are needed to record a video.</Text>
          <Pressable
            style={styles.permissionButton}
            onPress={() => {
              requestCameraPermission();
              requestMicPermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant access</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.permissionCancel}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide">
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" />

        <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>

        {!recording && countdown === null ? (
          <Pressable
            style={styles.flipButton}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            hitSlop={12}
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
          </Pressable>
        ) : null}

        {!recording && countdown === null ? (
          <Pressable
            style={[styles.timerButton, timerEnabled && styles.timerButtonActive]}
            onPress={() => setTimerEnabled((t) => !t)}
            hitSlop={12}
          >
            <Ionicons name="timer-outline" size={22} color={timerEnabled ? "#170F2B" : "#fff"} />
          </Pressable>
        ) : null}

        {!recording && countdown === null ? (
          selectedSong ? (
            <View style={styles.songChip}>
              <Pressable style={styles.songChipTap} onPress={() => setShowSongPicker(true)}>
                <Ionicons name="musical-notes" size={14} color="#fff" />
                <Text style={styles.songChipText} numberOfLines={1}>
                  {selectedSong.title} - {selectedSong.artist}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSelectedSong(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.songChip} onPress={() => setShowSongPicker(true)}>
              <Ionicons name="musical-notes-outline" size={14} color="#fff" />
              <Text style={styles.songChipText}>Add sound</Text>
            </Pressable>
          )
        ) : null}

        {countdown !== null ? (
          <View style={styles.countdownOverlay} pointerEvents="none">
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        ) : null}

        {recording ? (
          <View style={styles.elapsedRow} pointerEvents="none">
            <View style={styles.recDot} />
            <Text style={styles.elapsedText}>
              {formatTime(elapsed)} / {formatTime(MAX_DURATION_SECONDS)}
            </Text>
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <Pressable onPress={handleRecordPress} style={styles.recordOuter} hitSlop={12}>
            <View style={[styles.recordInner, recording && styles.recordInnerActive]} />
          </Pressable>
        </View>

        {showSongPicker ? (
          <KeyboardAvoidingView
            style={styles.songPickerOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.songPickerCard}>
              <View style={styles.songPickerHeader}>
                <Text style={styles.songPickerTitle}>Add sound</Text>
                <Pressable onPress={() => setShowSongPicker(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#fff" />
                </Pressable>
              </View>
              <TextInput
                style={styles.songInput}
                value={songQuery}
                onChangeText={setSongQuery}
                placeholder="Search for a song..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                autoFocus
              />
              {searching ? <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} /> : null}
              <ScrollView
                style={styles.songResultsScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {songResults.map((song) => (
                  <Pressable
                    key={song.id}
                    style={styles.songResultRow}
                    onPress={() => {
                      setSelectedSong(song);
                      setSongQuery("");
                      setSongResults([]);
                      setShowSongPicker(false);
                    }}
                  >
                    <Image source={{ uri: song.artworkUrl }} style={styles.songArtwork} />
                    <View style={styles.songResultInfo}>
                      <Text style={styles.songResultTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={styles.songResultArtist} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  permissionText: { color: "#fff", fontSize: 15, textAlign: "center" },
  permissionButton: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  permissionButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  permissionCancel: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600" },
  closeButton: { position: "absolute", top: 50, left: 16, zIndex: 10 },
  flipButton: { position: "absolute", top: 50, right: 16, zIndex: 10 },
  timerButton: {
    position: "absolute",
    top: 100,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  timerButtonActive: { backgroundColor: ACCENT },
  songChip: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: "60%",
    zIndex: 10,
  },
  songChipTap: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  songChipText: { color: "#fff", fontSize: 12, fontWeight: "700", flexShrink: 1 },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  countdownText: { color: "#fff", fontSize: 96, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 12 },
  elapsedRow: {
    position: "absolute",
    top: 108,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D0342C" },
  elapsedText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bottomRow: { position: "absolute", bottom: 44, alignSelf: "center" },
  recordOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  recordInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: ACCENT,
  },
  recordInnerActive: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#D0342C",
  },
  songPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  songPickerCard: {
    backgroundColor: "#170F2B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  songPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  songPickerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  songInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
    marginBottom: 12,
  },
  songResultsScroll: { maxHeight: 280 },
  songResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 8,
    marginBottom: 8,
  },
  songArtwork: { width: 44, height: 44, borderRadius: 8 },
  songResultInfo: { flex: 1 },
  songResultTitle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  songResultArtist: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
});
