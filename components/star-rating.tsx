import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/contexts/theme-context";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

/** 1-5 star rating - interactive when `onChange` is passed, read-only otherwise. */
export function StarRating({ value, onChange, size = 22 }: StarRatingProps) {
  const { palette } = useTheme();
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((star) =>
        onChange ? (
          <Pressable key={star} onPress={() => onChange(star)} hitSlop={4}>
            <Ionicons
              name={star <= value ? "star" : "star-outline"}
              size={size}
              color={star <= value ? "#F5A623" : palette.textMuted}
            />
          </Pressable>
        ) : (
          <Ionicons
            key={star}
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={star <= value ? "#F5A623" : palette.textMuted}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
});
