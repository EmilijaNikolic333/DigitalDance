import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Event } from "@/lib/database.types";

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface ProfileEventCardProps {
  event: Event;
  onEditPress: () => void;
  onApplicationsPress: () => void;
}

export function ProfileEventCard({ event, onEditPress, onApplicationsPress }: ProfileEventCardProps) {
  return (
    <View style={styles.card}>
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

        <Pressable style={styles.editButton} onPress={onEditPress} hitSlop={8}>
          <Ionicons name="pencil" size={16} color="#093A7D" />
        </Pressable>
      </View>

      <Pressable style={styles.applicationsButton} onPress={onApplicationsPress}>
        <Text style={styles.applicationsButtonText}>View applications</Text>
      </Pressable>
    </View>
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
