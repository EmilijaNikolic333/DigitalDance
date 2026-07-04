import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { type EventWithOrganizer, getEventById } from "@/services/events";

const EVENT_TYPE_LABEL: Record<string, string> = {
  audition: "Audition",
  festival: "Festival",
  workshop: "Workshop",
  concert: "Concert",
  music_video: "Music video",
  promotion: "Promotion",
  celebration: "Celebration",
  corporate_event: "Corporate event",
  other: "Other",
};

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return (
    date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
    " at " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventWithOrganizer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventById(id).then((data) => {
      setEvent(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#093A7D" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Event not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.cover}>
          {event.cover_image_url ? (
            <Image source={{ uri: event.cover_image_url }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <Ionicons name="calendar" size={48} color="#fff" />
          )}
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={22} color="#093A7D" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          {event.organizer ? (
            <View style={styles.organizerRow}>
              <Avatar url={event.organizer.avatar_url} size={28} />
              <Text style={styles.organizerText}>
                {event.organizer.organization_name || event.organizer.full_name || "Organizer"}
              </Text>
            </View>
          ) : null}

          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color="#C06BE4" />
            <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
          </View>
          {event.city ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color="#C06BE4" />
              <Text style={styles.metaText}>{event.city}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionHeading}>More details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                {event.price === null ? "/" : event.price === 0 ? "Free" : `${event.price} din`}
              </Text>
            </View>
            {event.requirements ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Requirements</Text>
                <Text style={[styles.detailValue, styles.detailValueMultiline]}>{event.requirements}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#F8ECFF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8ECFF" },
  notFoundText: { fontSize: 15, color: "#093A7D" },
  container: { paddingBottom: 40 },
  cover: {
    width: "100%",
    height: 240,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { width: "100%", height: "100%" },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
  },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginBottom: 8 },
  organizerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  organizerText: { fontSize: 13, fontWeight: "600", color: "#093A7D" },
  description: { fontSize: 14, color: "#093A7D", lineHeight: 21, marginBottom: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  metaText: { fontSize: 14, color: "#093A7D", fontWeight: "600" },
  sectionHeading: { fontSize: 15, fontWeight: "800", color: "#093A7D", marginTop: 16, marginBottom: 10 },
  detailsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  detailLabel: { fontSize: 13, color: "#9B7FC7", fontWeight: "600" },
  detailValue: { fontSize: 13, color: "#093A7D", fontWeight: "700", flexShrink: 1, textAlign: "right" },
  detailValueMultiline: { textAlign: "left", flex: 1 },
});
