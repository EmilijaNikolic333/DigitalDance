import { Image } from "expo-image";
import { StyleSheet } from "react-native";

interface AvatarProps {
  url?: string | null;
  size?: number;
}

export function Avatar({ url, size = 96 }: AvatarProps) {
  return (
    <Image
      source={url ? { uri: url } : require("@/assets/images/avatar.png")}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      contentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#F8ECFF",
  },
});
