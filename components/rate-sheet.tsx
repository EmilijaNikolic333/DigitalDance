import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RatingRow } from "@/components/rating-row";
import { useTheme } from "@/contexts/theme-context";
import type { EventRating } from "@/lib/database.types";
import type { Palette } from "@/lib/theme";

export interface RateSheetTarget {
  userId: string;
  name: string;
  avatar?: string | null;
  given?: EventRating;
  received?: EventRating;
}

interface RateSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  eventId: string;
  targets: RateSheetTarget[];
  onRated: (userId: string, rating: EventRating) => void;
}

/** A bottom sheet listing one or more people to rate for a given event (or their already-given rating). */
export function RateSheet({ visible, onClose, title, eventId, targets, onRated }: RateSheetProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {targets.map((target) => (
              <RatingRow
                key={target.userId}
                eventId={eventId}
                userId={target.userId}
                name={target.name}
                avatar={target.avatar}
                given={target.given}
                received={target.received}
                onRated={(rating) => onRated(target.userId, rating)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(9, 58, 125, 0.4)", justifyContent: "flex-end" },
    sheet: {
      minHeight: "35%",
      maxHeight: "80%",
      backgroundColor: p.gradient[0],
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 10,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(192, 107, 228, 0.4)",
      alignSelf: "center",
      marginBottom: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 12,
    },
    headerTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: p.text },
    list: { paddingHorizontal: 20 },
  });
}
