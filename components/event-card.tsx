import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShareToSheet } from "@/components/share-to-sheet";
import { useRepostContext } from "@/contexts/repost-context";
import { useSavedContext } from "@/contexts/saved-context";
import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";
import type { EventWithOrganizer } from "@/services/events";
import { toggleRepostEvent } from "@/services/reposted-events";
import { toggleSaveEvent } from "@/services/saved-events";

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return (
    date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " @ " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

interface EventCardProps {
  event: EventWithOrganizer;
  onPress: () => void;
  isApplied?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
}

export function EventCard({ event, onPress, isApplied, isSaved, isReposted }: EventCardProps) {
  const { isEventReposted, setEventReposted } = useRepostContext();
  const reposted = isEventReposted(event.id, isReposted ?? false);
  const { isEventSaved, setEventSaved } = useSavedContext();
  const saved = isEventSaved(event.id, isSaved ?? false);
  const [showShare, setShowShare] = useState(false);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const handleToggleSave = async () => {
    const nextSaved = !saved;
    setEventSaved(event.id, nextSaved);

    const { saved: confirmedSaved, error } = await toggleSaveEvent(event.id, event.organizer_id);
    if (error) {
      setEventSaved(event.id, !nextSaved);
      return;
    }
    setEventSaved(event.id, confirmedSaved);
  };

  const handleToggleRepost = async () => {
    const nextReposted = !reposted;
    setEventReposted(event.id, nextReposted);

    const { reposted: confirmedReposted, error } = await toggleRepostEvent(event.id, event.organizer_id);
    if (error) {
      setEventReposted(event.id, !nextReposted);
      return;
    }
    setEventReposted(event.id, confirmedReposted);
  };

  return (
    <Pressable style={[styles.card, isApplied && styles.cardApplied]} onPress={onPress}>
      <View style={styles.cover}>
        {event.cover_image_url ? (
          <Image source={{ uri: event.cover_image_url }} style={styles.coverImage} contentFit="cover" />
        ) : (
          <Ionicons name="calendar" size={28} color="#fff" />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={palette.textMuted} />
          <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
        </View>
        {event.city ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={palette.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.city}
            </Text>
          </View>
        ) : null}

        <View style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>View details</Text>
        </View>
      </View>

      <View style={styles.actionColumn}>
        <Pressable style={styles.saveButton} onPress={handleToggleSave} hitSlop={8}>
          <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={16} color={saved ? palette.accent : palette.text} />
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleToggleRepost} hitSlop={8}>
          <Ionicons name="repeat" size={16} color={reposted ? palette.accent : palette.text} />
        </Pressable>
        <Pressable style={styles.saveButton} onPress={() => setShowShare(true)} hitSlop={8}>
          <Ionicons name="paper-plane-outline" size={16} color={palette.text} />
        </Pressable>
      </View>
      <ShareToSheet eventId={event.id} visible={showShare} onClose={() => setShowShare(false)} />
    </Pressable>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      width: "100%",
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 10,
      marginBottom: 14,
      gap: 12,
    },
    cardApplied: { backgroundColor: p.gradient[1] },
    cover: {
      width: 80,
      height: 100,
      borderRadius: 12,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    coverImage: { width: "100%", height: "100%" },
    saveButton: {
      alignSelf: "flex-start",
      padding: 6,
      backgroundColor: p.gradient[0],
      borderRadius: 14,
    },
    actionColumn: { alignSelf: "flex-start", gap: 8 },
    info: { flex: 1, gap: 3 },
    title: { fontSize: 15, fontWeight: "700", color: p.text },
    description: { fontSize: 12, color: p.text, opacity: 0.8, marginTop: 2 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    metaText: { fontSize: 11, color: p.textMuted },
    detailsButton: {
      alignSelf: "flex-end",
      backgroundColor: p.buttonBg,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 14,
      marginTop: 8,
    },
    detailsButtonText: { color: p.buttonText, fontSize: 12, fontWeight: "700" },
  });
}
