import { useIsFocused } from "@react-navigation/native";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VideoFeedItem } from "@/components/video-feed-item";
import { type FeedVideo, getFeedVideos } from "@/services/videos";

export default function FeedScreen() {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    getFeedVideos().then(({ data, error: loadError }) => {
      setVideos(data);
      setError(loadError ?? null);
      setLoading(false);
      hasLoadedRef.current = true;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveId(viewableItems[0].item.id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const header = (
    <Image
      source={require("@/assets/images/icon.png")}
      style={[styles.headerLogo, { top: insets.top + 8 }]}
      contentFit="contain"
    />
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        {header}
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.emptyText}>Couldn&apos;t load videos. Check your connection.</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.emptyText}>No videos yet. Be the first to post one!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {containerHeight > 0 ? (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoFeedItem video={item} height={containerHeight} active={isFocused && item.id === activeId} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={containerHeight}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: containerHeight, offset: containerHeight * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      ) : null}
      {header}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#fff", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#C06BE4",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  headerLogo: {
    position: "absolute",
    alignSelf: "center",
    width: 270,
    height: 50,
    zIndex: 10,
  },
});
