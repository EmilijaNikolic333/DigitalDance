import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_STYLE } from "@/lib/application-status";
import type { MyApplication } from "@/services/applications";

function formatEventDate(iso: string) {
  return (
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

interface MyApplicationCardProps {
  application: MyApplication;
  onViewDetails: () => void;
}

export function MyApplicationCard({ application, onViewDetails }: MyApplicationCardProps) {
  const event = application.event;
  const statusStyle = APPLICATION_STATUS_STYLE[application.status];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.cover}>
          {event?.cover_image_url ? (
            <Image source={{ uri: event.cover_image_url }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <Ionicons name="calendar" size={22} color="#fff" />
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {event?.title ?? "Event"}
          </Text>
          {event ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color="#9B7FC7" />
              <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
            </View>
          ) : null}
          {event?.city ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color="#9B7FC7" />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.city}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name={statusStyle.icon} size={13} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {APPLICATION_STATUS_LABEL[application.status]}
            </Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.detailsButton} onPress={onViewDetails}>
        <Text style={styles.detailsButtonText}>View details</Text>
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
  row: { flexDirection: "row", gap: 12 },
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
  statusText: { fontSize: 11, fontWeight: "700" },
  detailsButton: {
    alignSelf: "flex-end",
    backgroundColor: "#093A7D",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  detailsButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
