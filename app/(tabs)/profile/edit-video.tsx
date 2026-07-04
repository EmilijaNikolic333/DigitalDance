import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { createVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "@/lib/supabase";
import { type Song, searchSongs } from "@/services/music";
import {
  deleteVideo,
  getVideoById,
  updateVideo,
  uploadVideoThumbnail,
} from "@/services/videos";

const DANCE_STYLES = ["hip hop", "contemporary", "ballet", "breakdance", "jazz", "latin"];

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

export default function EditVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [frameCandidates, setFrameCandidates] = useState<{ time: number; uri: string }[]>([]);
  const [generatingFrames, setGeneratingFrames] = useState(false);
  const [caption, setCaption] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVideoById(id).then((video) => {
      if (video) {
        setVideoUrl(video.video_url);
        setThumbnailUri(video.thumbnail_url);
        setCaption(video.description ?? "");
        setStyle(video.dance_style);
        if (video.song_title) {
          setSelectedSong({
            id: -1,
            title: video.song_title,
            artist: video.song_artist ?? "",
            previewUrl: video.song_preview_url ?? "",
            artworkUrl: "",
          });
        }
      }
      setLoading(false);
    });
  }, [id]);

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

  // Generate frame candidates spread evenly across the video's whole length so the
  // user can choose a new cover straight from their own footage, same as when posting.
  useEffect(() => {
    if (!videoUrl) return;

    let cancelled = false;
    setGeneratingFrames(true);

    getVideoDurationSeconds(videoUrl).then(async (duration) => {
      if (cancelled) return;

      const fractions = [0, 0.25, 0.5, 0.75, 0.95];
      const candidateTimes = duration
        ? fractions.map((f) => Math.floor(f * duration * 1000))
        : [0, 1000, 2000, 3000, 4000];

      const results = await Promise.allSettled(
        candidateTimes.map((time) => VideoThumbnails.getThumbnailAsync(videoUrl, { time, quality: 0.6 }))
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
  }, [videoUrl]);

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

  const handleSave = async () => {
    setError(null);

    if (!caption.trim()) {
      setError("Write a caption for your video.");
      return;
    }
    if (!style) {
      setError("Pick a dance style.");
      return;
    }
    if (!thumbnailUri) {
      setError("Choose a cover image for your video.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Not authenticated.");
      return;
    }

    // Only re-upload the cover if the user picked a new local one; otherwise keep the existing URL.
    let thumbnailUrl = thumbnailUri;
    if (thumbnailUri.startsWith("file://") || thumbnailUri.startsWith("content://")) {
      const { publicUrl, error: uploadError } = await uploadVideoThumbnail(user.id, thumbnailUri);
      if (uploadError || !publicUrl) {
        setSaving(false);
        setError(`Couldn't upload cover: ${uploadError?.message ?? "unknown error"}`);
        return;
      }
      thumbnailUrl = publicUrl;
    }

    const { error: updateError } = await updateVideo(id, {
      description: caption.trim(),
      dance_style: style,
      thumbnail_url: thumbnailUrl,
      ...(selectedSong
        ? {
            song_title: selectedSong.title,
            song_artist: selectedSong.artist,
            song_preview_url: selectedSong.previewUrl,
          }
        : {}),
    });

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    Alert.alert("Successfully edited", undefined, [{ text: "OK", onPress: () => router.back() }]);
  };

  const handleDelete = () => {
    Alert.alert("Delete video", "Are you sure you want to delete this video?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          const { error: deleteError } = await deleteVideo(id);
          setDeleting(false);

          if (deleteError) {
            setError(deleteError.message);
            return;
          }

          Alert.alert("Successfully deleted video", undefined, [{ text: "OK", onPress: () => router.back() }]);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#093A7D" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <ScrollView contentContainerStyle={styles.detailsContainer} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={26} color="#093A7D" />
          </Pressable>

          <Text style={styles.title}>Edit video</Text>

          <Text style={styles.label}>Cover</Text>
          <Text style={styles.helperText}>Pick a frame from your video</Text>
          {generatingFrames ? (
            <ActivityIndicator color="#093A7D" style={{ marginBottom: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.frameRow}
              style={styles.frameScroll}
            >
              <Pressable style={styles.addFrameTile} onPress={addCoverFromGallery}>
                <Ionicons name="add" size={22} color="#093A7D" />
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

          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption..."
            placeholderTextColor="#9AA5B8"
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
              {selectedSong.artworkUrl ? (
                <Image source={{ uri: selectedSong.artworkUrl }} style={styles.songArtwork} />
              ) : (
                <View style={[styles.songArtwork, styles.songArtworkPlaceholder]}>
                  <Ionicons name="musical-notes" size={18} color="#093A7D" />
                </View>
              )}
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {selectedSong.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {selectedSong.artist}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedSong(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color="#093A7D" />
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={songQuery}
                onChangeText={setSongQuery}
                placeholder="Search for a song..."
                placeholderTextColor="#9AA5B8"
              />
              {searching ? <ActivityIndicator color="#093A7D" style={{ marginBottom: 12 }} /> : null}
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

          <Pressable style={styles.postButton} onPress={handleSave} disabled={saving || deleting}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Save changes</Text>}
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={saving || deleting}>
            {deleting ? (
              <ActivityIndicator color="#D0342C" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete video</Text>
            )}
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  detailsContainer: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 60 },
  closeButton: { position: "absolute", top: 16, left: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginBottom: 24 },
  error: { color: "#D0342C", fontSize: 13, marginBottom: 12, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "700", color: "#093A7D", alignSelf: "flex-start", marginBottom: 4 },
  helperText: { fontSize: 12, color: "#9B7FC7", alignSelf: "flex-start", marginBottom: 10 },
  frameScroll: { width: "100%", marginBottom: 20 },
  frameRow: { gap: 8 },
  addFrameTile: {
    width: 70,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 6,
  },
  addFrameTileText: { color: "#093A7D", fontSize: 10, fontWeight: "600", textAlign: "center" },
  frameThumb: {
    width: 70,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  frameThumbSelected: {
    borderWidth: 3,
    borderColor: "#093A7D",
  },
  frameCheckBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#093A7D",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: "#093A7D",
    marginBottom: 20,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%", marginBottom: 20 },
  chip: { backgroundColor: "#fff", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18 },
  chipSelected: { backgroundColor: "#093A7D" },
  chipText: { color: "#093A7D", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
  songResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 8,
    width: "100%",
    marginBottom: 8,
  },
  selectedSongRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 8,
    width: "100%",
    marginBottom: 20,
  },
  songArtwork: { width: 44, height: 44, borderRadius: 8 },
  songArtworkPlaceholder: { backgroundColor: "#F8ECFF", alignItems: "center", justifyContent: "center" },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 13, fontWeight: "700", color: "#093A7D" },
  songArtist: { fontSize: 12, color: "#9B7FC7" },
  postButton: {
    marginTop: 10,
    backgroundColor: "#093A7D",
    paddingVertical: 15,
    paddingHorizontal: 48,
    borderRadius: 28,
    alignItems: "center",
    width: "100%",
  },
  postButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  deleteButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  deleteButtonText: { color: "#D0342C", fontWeight: "700", fontSize: 15 },
});
