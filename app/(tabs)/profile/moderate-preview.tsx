import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";
import { getModerationPreview, type ModerationPreview, type ReportContentType } from "@/services/reports";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Read-only content preview for the moderation flow (Reports screen) - shows a reported or
 * already-removed video/event as-is, ignoring is_hidden, so an admin can actually judge it
 * before deciding to remove/dismiss/restore. */
export default function ModeratePreviewScreen() {
  const { type, id } = useLocalSearchParams<{ type: ReportContentType; id: string }>();
  const [preview, setPreview] = useState<ModerationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  useEffect(() => {
    getModerationPreview(type, id).then((data) => {
      setPreview(data);
      setLoading(false);
    });
  }, [type, id]);

  if (loading) {
    return (
      <LinearGradient colors={palette.gradient} style={styles.background}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.text} />
        </View>
      </LinearGradient>
    );
  }

  if (!preview) {
    return (
      <LinearGradient colors={palette.gradient} style={styles.background}>
        <View style={styles.centered}>
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.text} />
          </Pressable>
          <Text style={styles.notFoundText}>This content no longer exists.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color={palette.text} />
        </Pressable>

        {preview.type === "video" && preview.videoUrl ? (
          <VideoPreview url={preview.videoUrl} />
        ) : preview.coverImageUrl ? (
          <Image source={{ uri: preview.coverImageUrl }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name={preview.type === "video" ? "videocam" : "calendar"} size={32} color="#fff" />
          </View>
        )}

        <Text style={styles.title}>{preview.title}</Text>
        <Text style={styles.meta}>
          {preview.type} · by {preview.authorName} · {formatDate(preview.createdAt)}
        </Text>

        {preview.description ? <Text style={styles.description}>{preview.description}</Text> : null}

        {preview.type === "video" && preview.danceStyle ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>#{preview.danceStyle.replace(" ", "")}</Text>
          </View>
        ) : null}

        {preview.type === "event" ? (
          <>
            {preview.eventDate ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={15} color={palette.textMuted} />
                <Text style={styles.infoText}>{formatDate(preview.eventDate)}</Text>
              </View>
            ) : null}
            {preview.city ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={15} color={palette.textMuted} />
                <Text style={styles.infoText}>{preview.city}</Text>
              </View>
            ) : null}
            {preview.requirements ? (
              <>
                <Text style={styles.label}>Requirements</Text>
                <Text style={styles.description}>{preview.requirements}</Text>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });

  return <VideoView player={player} style={videoPreviewStyles.video} contentFit="cover" nativeControls />;
}

const videoPreviewStyles = StyleSheet.create({
  video: { width: "100%", height: 400, borderRadius: 16, backgroundColor: "#000" },
});

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 90, paddingBottom: 40 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    closeButton: { position: "absolute", top: 50, left: 16, zIndex: 1 },
    notFoundText: { fontSize: 15, color: p.text },
    cover: { width: "100%", height: 200, borderRadius: 16 },
    coverPlaceholder: {
      width: "100%",
      height: 200,
      borderRadius: 16,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 20, fontWeight: "700", color: p.text, marginTop: 20, alignSelf: "flex-start" },
    meta: {
      fontSize: 12,
      color: p.textMuted,
      textTransform: "capitalize",
      marginTop: 4,
      marginBottom: 12,
      alignSelf: "flex-start",
    },
    description: { fontSize: 14, color: p.text, lineHeight: 20, alignSelf: "flex-start" },
    chip: {
      alignSelf: "flex-start",
      backgroundColor: p.card,
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginTop: 12,
    },
    chipText: { color: p.text, fontSize: 12, fontWeight: "700" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, alignSelf: "flex-start" },
    infoText: { fontSize: 13, color: p.text },
    label: { fontSize: 13, fontWeight: "700", color: p.text, marginTop: 16, alignSelf: "flex-start" },
  });
}
