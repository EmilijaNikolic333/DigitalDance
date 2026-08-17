import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { StarRating } from "@/components/star-rating";
import { useTheme } from "@/contexts/theme-context";
import type { EventRating } from "@/lib/database.types";
import type { Palette } from "@/lib/theme";
import { rateForEvent } from "@/services/ratings";

interface RatingRowProps {
  eventId: string;
  userId: string;
  name: string;
  avatar?: string | null;
  /** The rating the current viewer already gave this person for this event, if any. */
  given?: EventRating;
  /** The rating this person already gave the current viewer for this event, if any. */
  received?: EventRating;
  onRated: (rating: EventRating) => void;
}

/** One person's rating block - shown either as a submit form, or as the rating already given, plus what came back. */
export function RatingRow({ eventId, userId, name, avatar, given, received, onRated }: RatingRowProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setError(null);
    setSubmitting(true);
    const { error: submitError } = await rateForEvent(eventId, userId, rating, comment);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    onRated({
      id: `${eventId}-${userId}`,
      event_id: eventId,
      rater_id: "",
      ratee_id: userId,
      rating,
      comment: comment.trim() || null,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Avatar url={avatar} size={32} />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>

      {given ? (
        <View style={styles.block}>
          <Text style={styles.label}>You rated:</Text>
          <StarRating value={given.rating} size={16} />
          {given.comment ? <Text style={styles.comment}>&quot;{given.comment}&quot;</Text> : null}
        </View>
      ) : (
        <View style={styles.block}>
          <StarRating value={rating} onChange={setRating} size={22} />
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Leave a comment (optional)"
            placeholderTextColor={palette.textMuted}
            multiline
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={rating === 0 || submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit rating</Text>
            )}
          </Pressable>
        </View>
      )}

      {received ? (
        <View style={[styles.block, styles.receivedBlock]}>
          <Text style={styles.label}>They rated you:</Text>
          <StarRating value={received.rating} size={16} />
          {received.comment ? <Text style={styles.comment}>&quot;{received.comment}&quot;</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    row: { width: "100%", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(192, 107, 228, 0.2)" },
    header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    name: { fontSize: 13, fontWeight: "700", color: p.text, flexShrink: 1 },
    block: { gap: 6, marginBottom: 6 },
    receivedBlock: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(192, 107, 228, 0.15)" },
    label: { fontSize: 11, fontWeight: "700", color: p.textMuted, textTransform: "uppercase" },
    comment: { fontSize: 12, color: p.text, fontStyle: "italic" },
    input: {
      backgroundColor: p.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: p.text,
      minHeight: 40,
      textAlignVertical: "top",
    },
    error: { fontSize: 11, color: "#D0342C" },
    submitButton: {
      alignSelf: "flex-start",
      backgroundColor: p.accent,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 14,
    },
    submitText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  });
}
