import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { createVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CameraRecorder } from "@/components/camera-recorder";
import { VideoPreviewModal } from "@/components/video-preview-modal";
import { useTheme } from "@/contexts/theme-context";
import { DANCE_STYLES } from "@/lib/profile-options";
import { supabase } from "@/lib/supabase";
import type { Palette } from "@/lib/theme";
import { type Song, searchSongs } from "@/services/music";
import { createVideo, uploadVideoFile, uploadVideoThumbnail } from "@/services/videos";

/** Resolves with the video's duration in seconds, or null if it can't be determined in time. */
function getVideoDurationSeconds(uri: string): Promise<number | null> {
  return new Promise((resolve) => {
    const player = createVideoPlayer(uri);
    let settled = false;

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      player.release();
      resolve(duration);
    };

    const subscription = player.addListener("sourceLoad", (payload) => finish(payload.duration));
    setTimeout(() => finish(null), 4000);
  });
}

export default function NewVideoScreen() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [frameCandidates, setFrameCandidates] = useState<{ time: number; uri: string }[]>([]);
  const [generatingFrames, setGeneratingFrames] = useState(false);
  const [caption, setCaption] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { palette, darkMode } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

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

  // Once a video is picked, generate frame candidates spread evenly across its
  // whole length so the user can choose a cover straight from their own footage.
  useEffect(() => {
    if (!videoUri) {
      setFrameCandidates([]);
      setThumbnailUri(null);
      return;
    }

    let cancelled = false;
    setGeneratingFrames(true);

    getVideoDurationSeconds(videoUri).then(async (duration) => {
      if (cancelled) return;

      const fractions = [0, 0.25, 0.5, 0.75, 0.95];
      const candidateTimes = duration
        ? fractions.map((f) => Math.floor(f * duration * 1000))
        : [0, 1000, 2000, 3000, 4000];

      const results = await Promise.allSettled(
        candidateTimes.map((time) => VideoThumbnails.getThumbnailAsync(videoUri, { time, quality: 0.6 }))
      );
      if (cancelled) return;

      const frames = results
        .map((result, index) =>
          result.status === "fulfilled" ? { time: candidateTimes[index], uri: result.value.uri } : null
        )
        .filter((frame): frame is { time: number; uri: string } => frame !== null);

      setFrameCandidates(frames);
      setGeneratingFrames(false);
    });

    return () => {
      cancelled = true;
    };
  }, [videoUri]);

  const addCoverFromGallery = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to choose a cover. Please allow it in your device settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setFrameCandidates((current) => [{ time: -1, uri }, ...current]);
      setThumbnailUri(uri);
    }
  };

  const recordWithCamera = () => {
    setError(null);
    setShowCamera(true);
  };

  const handleRecorded = (uri: string, song: Song | null) => {
    setVideoUri(uri);
    if (song) setSelectedSong(song);
    setShowCamera(false);
  };

  const uploadFromGallery = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to choose a video. Please allow it in your device settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    setError(null);

    if (!videoUri) return;
    if (!thumbnailUri) {
      setError("Choose a cover image for your video.");
      return;
    }
    if (!caption.trim()) {
      setError("Write a description for your video.");
      return;
    }
    if (!style) {
      setError("Pick a dance style.");
      return;
    }

    setPosting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPosting(false);
      setError("Not authenticated.");
      return;
    }

    const { publicUrl, error: uploadError } = await uploadVideoFile(user.id, videoUri);
    if (uploadError || !publicUrl) {
      setPosting(false);
      setError(`Couldn't upload video: ${uploadError?.message ?? "unknown error"}`);
      return;
    }

    const { publicUrl: thumbnailUrl, error: thumbnailError } = await uploadVideoThumbnail(user.id, thumbnailUri);
    if (thumbnailError || !thumbnailUrl) {
      setPosting(false);
      setError(`Couldn't upload cover: ${thumbnailError?.message ?? "unknown error"}`);
      return;
    }

    const { error: createError } = await createVideo({
      description: caption.trim(),
      dance_style: style,
      video_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      ...(selectedSong
        ? {
            song_title: selectedSong.title,
            song_artist: selectedSong.artist,
            song_preview_url: selectedSong.previewUrl,
          }
        : {}),
    });

    setPosting(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    router.back();
  };

  if (!videoUri) {
    return (
      <LinearGradient colors={palette.gradient} style={styles.background}>
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.text} />
          </Pressable>

          <Text style={styles.title}>Add new video</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.sourceButton} onPress={recordWithCamera}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.sourceButtonText}>Record with camera</Text>
          </Pressable>

          <Pressable style={styles.sourceButton} onPress={uploadFromGallery}>
            <Ionicons name="images" size={20} color="#fff" />
            <Text style={styles.sourceButtonText}>Upload from gallery</Text>
          </Pressable>

          <Image
            source={
              darkMode
                ? require("@/assets/images/onboarding-dancer-dark.png")
                : require("@/assets/images/onboarding-dancer.png")
            }
            style={styles.dancer}
            contentFit="contain"
          />
        </View>

        <CameraRecorder visible={showCamera} onClose={() => setShowCamera(false)} onRecorded={handleRecorded} />
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={palette.gradient} style={styles.background}>
        <ScrollView contentContainerStyle={styles.detailsContainer} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setVideoUri(null)} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.text} />
          </Pressable>

          <Text style={styles.title}>Add details</Text>

          <Pressable style={styles.previewButton} onPress={() => setShowPreview(true)}>
            <Ionicons name="play-circle-outline" size={20} color={palette.text} />
            <Text style={styles.previewButtonText}>Preview video</Text>
          </Pressable>

          <Text style={styles.label}>Cover</Text>
          <Text style={styles.helperText}>Pick a frame from your video</Text>
          {generatingFrames ? (
            <ActivityIndicator color={palette.text} style={{ marginBottom: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.frameRow}
              style={styles.frameScroll}
            >
              <Pressable style={styles.addFrameTile} onPress={addCoverFromGallery}>
                <Ionicons name="add" size={22} color={palette.text} />
                <Text style={styles.addFrameTileText}>Add from gallery</Text>
              </Pressable>

              {frameCandidates.map((frame) => (
                <Pressable key={frame.uri} onPress={() => setThumbnailUri(frame.uri)}>
                  <Image
                    source={{ uri: frame.uri }}
                    style={[styles.frameThumb, thumbnailUri === frame.uri && styles.frameThumbSelected]}
                    contentFit="cover"
                  />
                  {thumbnailUri === frame.uri ? (
                    <View style={styles.frameCheckBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a description..."
            placeholderTextColor={palette.textMuted}
            multiline
          />

          <Text style={styles.label}>Dance style</Text>
          <View style={styles.chipRow}>
            {DANCE_STYLES.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, style === s && styles.chipSelected]}
                onPress={() => setStyle(s)}
              >
                <Text style={[styles.chipText, style === s && styles.chipTextSelected]}>#{s.replace(" ", "")}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Music (optional)</Text>
          {selectedSong ? (
            <View style={styles.selectedSongRow}>
              <Image source={{ uri: selectedSong.artworkUrl }} style={styles.songArtwork} />
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {selectedSong.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {selectedSong.artist}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedSong(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={palette.text} />
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={songQuery}
                onChangeText={setSongQuery}
                placeholder="Search for a song..."
                placeholderTextColor={palette.textMuted}
              />
              {searching ? <ActivityIndicator color={palette.text} style={{ marginBottom: 12 }} /> : null}
              {songResults.map((song) => (
                <Pressable
                  key={song.id}
                  style={styles.songResultRow}
                  onPress={() => {
                    setSelectedSong(song);
                    setSongQuery("");
                    setSongResults([]);
                  }}
                >
                  <Image source={{ uri: song.artworkUrl }} style={styles.songArtwork} />
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {song.artist}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.postButton} onPress={handlePost} disabled={posting}>
            {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Post video</Text>}
          </Pressable>
        </ScrollView>

        <VideoPreviewModal
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          videoUri={videoUri}
          song={selectedSong}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    background: { flex: 1 },
    container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    detailsContainer: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 60 },
    closeButton: { position: "absolute", top: 16, left: 16 },
    title: { fontSize: 22, fontWeight: "700", color: p.text, marginBottom: 24 },
    error: { color: "#D0342C", fontSize: 13, marginBottom: 12, textAlign: "center" },
    sourceButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: p.buttonBg,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 24,
      width: "100%",
      justifyContent: "center",
      marginBottom: 14,
    },
    sourceButtonText: { color: p.buttonText, fontWeight: "700", fontSize: 15 },
    previewButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: p.card,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 20,
      marginBottom: 20,
    },
    previewButtonText: { color: p.text, fontWeight: "700", fontSize: 14 },
    dancer: { width: "100%", height: 220, marginTop: 24 },
    label: { fontSize: 14, fontWeight: "700", color: p.text, alignSelf: "flex-start", marginBottom: 4 },
    helperText: { fontSize: 12, color: p.textMuted, alignSelf: "flex-start", marginBottom: 10 },
    frameScroll: { width: "100%", marginBottom: 20 },
    frameRow: { gap: 8 },
    addFrameTile: {
      width: 70,
      height: 120,
      borderRadius: 12,
      backgroundColor: p.card,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      padding: 6,
    },
    addFrameTileText: { color: p.text, fontSize: 10, fontWeight: "700", textAlign: "center" },
    frameThumb: {
      width: 70,
      height: 120,
      borderRadius: 12,
      backgroundColor: p.card,
    },
    frameThumbSelected: {
      borderWidth: 3,
      borderColor: p.text,
    },
    frameCheckBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: p.buttonBg,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      width: "100%",
      backgroundColor: p.card,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 12,
      fontSize: 15,
      color: p.text,
      marginBottom: 20,
    },
    inputMultiline: { minHeight: 70, textAlignVertical: "top" },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%", marginBottom: 20 },
    chip: { backgroundColor: p.card, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18 },
    chipSelected: { backgroundColor: p.selectedBg },
    chipText: { color: p.text, fontSize: 13, fontWeight: "700" },
    chipTextSelected: { color: p.selectedText },
    songResultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: p.card,
      borderRadius: 14,
      padding: 8,
      width: "100%",
      marginBottom: 8,
    },
    selectedSongRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: p.card,
      borderRadius: 14,
      padding: 8,
      width: "100%",
      marginBottom: 20,
    },
    songArtwork: { width: 44, height: 44, borderRadius: 8 },
    songInfo: { flex: 1 },
    songTitle: { fontSize: 13, fontWeight: "700", color: p.text },
    songArtist: { fontSize: 12, color: p.textMuted },
    postButton: {
      marginTop: 10,
      backgroundColor: p.buttonBg,
      paddingVertical: 15,
      paddingHorizontal: 48,
      borderRadius: 28,
      alignItems: "center",
    },
    postButtonText: { color: p.buttonText, fontWeight: "700", fontSize: 16 },
  });
}
