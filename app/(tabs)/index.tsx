import { useIsFocused } from "@react-navigation/native";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useTheme } from "@/contexts/theme-context";
import {
  getFeedRecommendationsCache,
  isRecommendationsStale,
  refreshFeedRecommendations,
} from "@/services/recommendations";
import { type FeedVideo, getFeedVideos, getRecommendedFeedVideos } from "@/services/videos";

type FeedTab = "spotlight" | "recommended";
type RecommendedVideo = FeedVideo & { reason: string };

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<FeedTab>("spotlight");

  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const [recommendedVideos, setRecommendedVideos] = useState<RecommendedVideo[]>([]);
  const [recommendedLoaded, setRecommendedLoaded] = useState(false);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);

  const [containerHeight, setContainerHeight] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const loadRecommended = useCallback(async (forceRefresh: boolean) => {
    setRecommendedLoading(true);
    setRecommendedError(null);

    const { updatedAt } = await getFeedRecommendationsCache();
    if (forceRefresh || isRecommendationsStale(updatedAt)) {
      const { error: refreshError } = await refreshFeedRecommendations();
      if (refreshError) {
        setRecommendedError(refreshError);
        setRecommendedLoading(false);
        setRecommendedLoaded(true);
        return;
      }
    }

    const { data, error: loadError } = await getRecommendedFeedVideos();
    setRecommendedVideos(data);
    setRecommendedError(loadError ?? null);
    setRecommendedLoading(false);
    setRecommendedLoaded(true);
  }, []);

  useEffect(() => {
    if (activeTab === "recommended" && !recommendedLoaded) {
      loadRecommended(false);
    }
  }, [activeTab, recommendedLoaded, loadRecommended]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveId(viewableItems[0].item.id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { darkMode } = useTheme();

  const header = (
    <View style={[styles.headerWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Image
        source={darkMode ? require("@/assets/images/icon-dark.png") : require("@/assets/images/icon.png")}
        style={styles.headerLogo}
        contentFit="contain"
      />
      <Pressable style={styles.labelLeft} onPress={() => setActiveTab("spotlight")} hitSlop={8}>
        <Text style={[styles.tabText, activeTab === "spotlight" && styles.tabTextActive]}>Spotlight</Text>
      </Pressable>
      <Pressable style={styles.labelRight} onPress={() => setActiveTab("recommended")} hitSlop={8}>
        <Text style={[styles.tabText, activeTab === "recommended" && styles.tabTextActive]}>Your Rhythm</Text>
      </Pressable>
    </View>
  );

  const activeVideos: FeedVideo[] = activeTab === "spotlight" ? videos : recommendedVideos;
  const activeLoading = activeTab === "spotlight" ? loading : recommendedLoading && !recommendedLoaded;

  if (activeLoading) {
    return (
      <View style={styles.centered}>
        {header}
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (activeTab === "spotlight" && error) {
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

  if (activeTab === "recommended" && recommendedError) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.emptyText}>Couldn&apos;t load recommendations: {recommendedError}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadRecommended(true)}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (activeVideos.length === 0) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.emptyText}>
          {activeTab === "spotlight"
            ? "No videos yet. Be the first to post one!"
            : "Like or save a few videos so we can learn your taste, then check back here."}
        </Text>
        {activeTab === "recommended" ? (
          <Pressable style={styles.retryButton} onPress={() => loadRecommended(true)}>
            <Text style={styles.retryButtonText}>Refresh</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {containerHeight > 0 ? (
        <FlatList
          key={activeTab}
          data={activeVideos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoFeedItem
              video={item}
              height={containerHeight}
              active={isFocused && item.id === activeId}
            />
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
  headerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  headerLogo: {
    width: 270,
    height: 50,
  },
  labelLeft: { position: "absolute", left: 16, top: 14, zIndex: 11 },
  labelRight: { position: "absolute", right: 16, top: 14, zIndex: 11 },
  tabText: { color: "rgba(192, 107, 228, 0.7)", fontSize: 16, fontWeight: "700" },
  tabTextActive: { color: "#C06BE4", textDecorationLine: "underline" },
});
