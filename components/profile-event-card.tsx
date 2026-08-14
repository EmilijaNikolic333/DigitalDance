import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Event } from "@/lib/database.types";
import { toggleSaveEvent } from "@/services/saved-events";

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface ProfileEventCardProps {
  event: Event;
  /** Whole-card tap - for viewing someone else's event (and applying from there). */
  onPress?: () => void;
  /** Owner-only actions. Omit both to show a plain, read-only card. */
  onEditPress?: () => void;
  onApplicationsPress?: () => void;
  /** Highlights the card - the current user has already applied to this event. */
  isApplied?: boolean;
  /** Shows a bookmark toggle - for events you don't organize. */
  showSaveButton?: boolean;
  isSaved?: boolean;
  /** Called right after this event is unsaved - e.g. to remove it from a Saved-events list immediately. */
  onUnsaved?: () => void;
}

export function ProfileEventCard({
  event,
  onPress,
  onEditPress,
  onApplicationsPress,
  isApplied,
  showSaveButton,
  isSaved,
  onUnsaved,
}: ProfileEventCardProps) {
  const CardWrapper = onPress ? Pressable : View;
  const showViewDetails = onPress && !onEditPress && !onApplicationsPress;
  const [saved, setSaved] = useState(isSaved ?? false);

  const handleToggleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);

    const { saved: confirmedSaved, error } = await toggleSaveEvent(event.id);
    if (error) {
      setSaved(!nextSaved);
      return;
    }
    setSaved(confirmedSaved);
    if (!confirmedSaved) onUnsaved?.();
  };

  return (
    <CardWrapper style={[styles.card, isApplied && styles.cardApplied]} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.cover}>
          {event.cover_image_url ? (
            <Image source={{ uri: event.cover_image_url }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <Ionicons name="calendar" size={22} color="#fff" />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color="#9B7FC7" />
            <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
          </View>
          {event.city ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color="#9B7FC7" />
              <Text style={styles.metaText}>{event.city}</Text>
            </View>
          ) : null}
          {event.price !== null ? (
            <Text style={styles.price}>{event.price === 0 ? "Free" : `${event.price} din`}</Text>
          ) : null}
        </View>

        {onEditPress ? (
          <Pressable style={styles.editButton} onPress={onEditPress} hitSlop={8}>
            <Ionicons name="pencil" size={16} color="#093A7D" />
          </Pressable>
        ) : showSaveButton ? (
          <Pressable style={styles.editButton} onPress={handleToggleSave} hitSlop={8}>
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={16}
              color={saved ? "#C06BE4" : "#093A7D"}
            />
          </Pressable>
        ) : null}
      </View>

      {onApplicationsPress ? (
        <Pressable style={styles.applicationsButton} onPress={onApplicationsPress}>
          <Text style={styles.applicationsButtonText}>View applications</Text>
        </Pressable>
      ) : null}

      {showViewDetails ? (
        <Pressable style={styles.applicationsButton} onPress={onPress}>
          <Text style={styles.applicationsButtonText}>View details</Text>
        </Pressable>
      ) : null}
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginTop: 14,
  },
  cardApplied: { backgroundColor: "#EAD9FF" },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverImage: { ...StyleSheet.absoluteFillObject },
  info: { flex: 1, justifyContent: "center", gap: 3 },
  title: { fontSize: 14, fontWeight: "700", color: "#093A7D" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#9B7FC7" },
  price: { fontSize: 12, fontWeight: "700", color: "#093A7D", marginTop: 2 },
  editButton: {
    alignSelf: "flex-start",
    padding: 6,
    backgroundColor: "#F8ECFF",
    borderRadius: 14,
  },
  applicationsButton: {
    alignSelf: "flex-end",
    backgroundColor: "#093A7D",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  applicationsButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
