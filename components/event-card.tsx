import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EventWithOrganizer } from "@/services/events";

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return (
    date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " @ " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export function EventCard({ event, onPress }: { event: EventWithOrganizer; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
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
          <Ionicons name="calendar-outline" size={13} color="#9B7FC7" />
          <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
        </View>
        {event.city ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color="#9B7FC7" />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.city}
            </Text>
          </View>
        ) : null}

        <View style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>View details</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    gap: 12,
  },
  cover: {
    width: 80,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: "100%" },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: "800", color: "#093A7D" },
  description: { fontSize: 12, color: "#093A7D", opacity: 0.8, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaText: { fontSize: 11, color: "#9B7FC7" },
  detailsButton: {
    alignSelf: "flex-end",
    backgroundColor: "#093A7D",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  detailsButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
