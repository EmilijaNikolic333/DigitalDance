import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

interface FollowBadgeProps {
  onPress: () => void;
  size?: number;
}

/** Small blue "+" badge overlaid on a user's avatar, shown when the current user doesn't follow them yet. */
export function FollowBadge({ onPress, size = 20 }: FollowBadgeProps) {
  return (
    <Pressable
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={onPress}
      hitSlop={6}
    >
      <Ionicons name="add" size={Math.round(size * 0.65)} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: "#2E7BF6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
