import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/contexts/theme-context";
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_STYLE } from "@/lib/application-status";
import type { Palette } from "@/lib/theme";
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
  /** Only present once the event has passed and this application was accepted. */
  rateButton?: { label: string; onPress: () => void };
}

export function MyApplicationCard({ application, onViewDetails, rateButton }: MyApplicationCardProps) {
  const event = application.event;
  const statusStyle = APPLICATION_STATUS_STYLE[application.status];
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

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
              <Ionicons name="calendar-outline" size={12} color={palette.textMuted} />
              <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
            </View>
          ) : null}
          {event?.city ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={palette.textMuted} />
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

      <View style={styles.actionsRow}>
        {rateButton ? (
          <Pressable style={styles.rateButton} onPress={rateButton.onPress}>
            <Text style={styles.rateButtonText}>{rateButton.label}</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.detailsButton} onPress={onViewDetails}>
          <Text style={styles.detailsButtonText}>View details</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    card: {
      width: "100%",
      backgroundColor: p.gradient[1],
      borderRadius: 16,
      padding: 10,
      marginTop: 14,
    },
    row: { flexDirection: "row", gap: 12 },
    cover: {
      width: 60,
      height: 60,
      borderRadius: 12,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    coverImage: { ...StyleSheet.absoluteFillObject },
    info: { flex: 1, justifyContent: "center", gap: 3 },
    title: { fontSize: 14, fontWeight: "700", color: p.text },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 11, color: p.textMuted },
    statusText: { fontSize: 11, fontWeight: "700" },
    actionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 },
    rateButton: {
      backgroundColor: p.card,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 14,
    },
    rateButtonText: { color: p.text, fontSize: 12, fontWeight: "700" },
    detailsButton: {
      backgroundColor: p.buttonBg,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 14,
    },
    detailsButtonText: { color: p.buttonText, fontSize: 12, fontWeight: "700" },
  });
}
