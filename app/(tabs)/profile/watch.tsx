import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Pressable, StyleSheet, View } from "react-native";

export default function WatchVideoScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
      <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { flex: 1 },
  closeButton: { position: "absolute", top: 50, left: 16 },
});
