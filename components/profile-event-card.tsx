import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShareToSheet } from "@/components/share-to-sheet";
import { useRepostContext } from "@/contexts/repost-context";
import { useSavedContext } from "@/contexts/saved-context";
import type { Event } from "@/lib/database.types";
import { toggleRepostEvent } from "@/services/reposted-events";
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
  /** Shows a repost toggle, below the save button - for events you don't organize. */
  showRepostButton?: boolean;
  isReposted?: boolean;
}

export function ProfileEventCard({
  event,
  onPress,
  onEditPress,
  onApplicationsPress,
  isApplied,
  showSaveButton,
  isSaved,
  showRepostButton,
  isReposted,
}: ProfileEventCardProps) {
  const CardWrapper = onPress ? Pressable : View;
  const showViewDetails = onPress && !onEditPress && !onApplicationsPress;
  const { isEventReposted, setEventReposted } = useRepostContext();
  const reposted = isEventReposted(event.id, isReposted ?? false);
  const { isEventSaved, setEventSaved } = useSavedContext();
  const saved = isEventSaved(event.id, isSaved ?? false);
  const [showShare, setShowShare] = useState(false);

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

        <View style={styles.actionColumn}>
          {onEditPress ? (
            <Pressable style={styles.editButton} onPress={onEditPress} hitSlop={8}>
              <Ionicons name="pencil" size={16} color="#093A7D" />
            </Pressable>
          ) : showSaveButton ? (
            <>
              <Pressable style={styles.editButton} onPress={handleToggleSave} hitSlop={8}>
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={16}
                  color={saved ? "#C06BE4" : "#093A7D"}
                />
              </Pressable>
              {showRepostButton ? (
                <Pressable style={styles.editButton} onPress={handleToggleRepost} hitSlop={8}>
                  <Ionicons name="repeat" size={16} color={reposted ? "#C06BE4" : "#093A7D"} />
                </Pressable>
              ) : null}
            </>
          ) : null}
          <Pressable style={styles.editButton} onPress={() => setShowShare(true)} hitSlop={8}>
            <Ionicons name="paper-plane-outline" size={16} color="#093A7D" />
          </Pressable>
        </View>
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

      <ShareToSheet eventId={event.id} visible={showShare} onClose={() => setShowShare(false)} />
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
  actionColumn: { gap: 8 },
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
