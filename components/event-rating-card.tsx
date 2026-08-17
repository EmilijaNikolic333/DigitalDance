import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { RatingRow } from "@/components/rating-row";
import { useTheme } from "@/contexts/theme-context";
import type { EventRating } from "@/lib/database.types";
import type { Palette } from "@/lib/theme";
import { getApplicationsForEvent, type ApplicantWithDancer } from "@/services/applications";
import type { OwnEvent } from "@/services/events";

interface EventRatingCardProps {
  event: OwnEvent;
  givenRatings: Map<string, EventRating>;
  receivedRatings: Map<string, EventRating>;
  onRated: (rateeId: string, rating: EventRating) => void;
}

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** An organizer's completed event, with a rating form/summary for each dancer they accepted. */
export function EventRatingCard({ event, givenRatings, receivedRatings, onRated }: EventRatingCardProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [dancers, setDancers] = useState<ApplicantWithDancer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplicationsForEvent(event.id).then(({ applications }) => {
      setDancers(applications.filter((a) => a.status === "accepted"));
      setLoading(false);
    });
  }, [event.id]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.cover}>
          {event.cover_image_url ? (
            <Image source={{ uri: event.cover_image_url }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <Ionicons name="calendar" size={20} color="#fff" />
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.date}>{formatEventDate(event.event_date)}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.text} style={{ marginTop: 12 }} />
      ) : dancers.length === 0 ? (
        <Text style={styles.emptyText}>No accepted dancers to rate.</Text>
      ) : (
        dancers.map((applicant) => (
          <RatingRow
            key={applicant.id}
            eventId={event.id}
            userId={applicant.dancer_id}
            name={applicant.dancer?.full_name || "Dancer"}
            avatar={applicant.dancer?.avatar_url}
            given={givenRatings.get(`${event.id}:${applicant.dancer_id}`)}
            received={receivedRatings.get(`${event.id}:${applicant.dancer_id}`)}
            onRated={(rating) => onRated(applicant.dancer_id, rating)}
          />
        ))
      )}
    </View>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    card: { width: "100%", backgroundColor: p.card, borderRadius: 16, padding: 14, marginTop: 14 },
    header: { flexDirection: "row", alignItems: "center", gap: 10 },
    cover: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    coverImage: { width: "100%", height: "100%" },
    headerInfo: { flex: 1, gap: 2 },
    title: { fontSize: 14, fontWeight: "700", color: p.text },
    date: { fontSize: 11, color: p.textMuted },
    emptyText: { fontSize: 12, color: p.textMuted, marginTop: 10 },
  });
}
