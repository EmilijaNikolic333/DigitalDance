import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { useTheme } from "@/contexts/theme-context";

interface AvatarProps {
  url?: string | null;
  size?: number;
}

export function Avatar({ url, size = 96 }: AvatarProps) {
  const { palette } = useTheme();

  return (
    <Image
      source={url ? { uri: url } : require("@/assets/images/avatar.png")}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.card }]}
      contentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {},
});
