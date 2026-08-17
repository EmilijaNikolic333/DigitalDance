import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { useTheme } from "@/contexts/theme-context";
import { goToUserProfile } from "@/lib/profile-navigation";
import { supabase } from "@/lib/supabase";
import type { Palette } from "@/lib/theme";
import { getLikers, type Liker } from "@/services/likes";

interface VideoLikesSheetProps {
  videoId: string;
  visible: boolean;
  onClose: () => void;
}

export function VideoLikesSheet({ videoId, visible, onClose }: VideoLikesSheetProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  // Only set when this sheet is opened from a /user/[id] profile screen - lets us avoid
  // re-navigating to the profile you're already looking at.
  const { id: viewingProfileId } = useLocalSearchParams<{ id?: string }>();

  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUserId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    getLikers(videoId).then(({ data, error }) => {
      setLikers(data);
      setLoadError(error ?? null);
      setLoading(false);
    });
  }, [visible, videoId]);

  const openProfile = (userId: string) => {
    onClose();
    goToUserProfile(userId, currentUserId, viewingProfileId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>{likers.length === 1 ? "1 like" : `${likers.length} likes`}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={palette.text} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={palette.text} style={styles.loading} />
          ) : loadError ? (
            <Text style={styles.error}>{loadError}</Text>
          ) : (
            <FlatList
              data={likers}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No likes yet.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.likerRow} onPress={() => openProfile(item.id)}>
                  <Avatar url={item.avatar_url} size={40} />
                  <Text style={styles.likerName} numberOfLines={1}>
                    {item.full_name || "Unknown"}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(9, 58, 125, 0.4)", justifyContent: "flex-end" },
    sheet: {
      minHeight: "45%",
      maxHeight: "75%",
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
    },
    headerTitle: { fontSize: 15, fontWeight: "700", color: p.text },
    loading: { marginTop: 30 },
    list: { flex: 1 },
    listContent: { flexGrow: 1, paddingHorizontal: 20, gap: 4 },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { fontSize: 13, color: p.textMuted, textAlign: "center" },
    likerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
    likerName: { fontSize: 14, fontWeight: "700", color: p.text, flexShrink: 1 },
    error: { color: "#D0342C", fontSize: 12, textAlign: "center", paddingHorizontal: 16, marginBottom: 6 },
  });
}
