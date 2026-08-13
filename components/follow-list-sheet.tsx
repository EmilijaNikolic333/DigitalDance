import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { getFollowers, getFollowing, type FollowUser } from "@/services/follows";

interface FollowListSheetProps {
  userId: string;
  mode: "followers" | "following";
  visible: boolean;
  onClose: () => void;
}

export function FollowListSheet({ userId, mode, visible, onClose }: FollowListSheetProps) {
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    const load = mode === "followers" ? getFollowers(userId) : getFollowing(userId);
    load.then(({ data, error }) => {
      setUsers(data);
      setLoadError(error ?? null);
      setLoading(false);
    });
  }, [visible, userId, mode]);

  const openProfile = (id: string) => {
    onClose();
    router.push({ pathname: "/user/[id]", params: { id } });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>{mode === "followers" ? "Followers" : "Following"}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#093A7D" />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#093A7D" style={styles.loading} />
          ) : loadError ? (
            <Text style={styles.error}>{loadError}</Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.userRow} onPress={() => openProfile(item.id)}>
                  <Avatar url={item.avatar_url} size={40} />
                  <Text style={styles.userName} numberOfLines={1}>
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(9, 58, 125, 0.4)", justifyContent: "flex-end" },
  sheet: {
    minHeight: "45%",
    maxHeight: "75%",
    backgroundColor: "#F8ECFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(9, 58, 125, 0.2)",
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
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#093A7D" },
  loading: { marginTop: 30 },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: 20, gap: 4 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: "#9B7FC7", textAlign: "center" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  userName: { fontSize: 14, fontWeight: "700", color: "#093A7D", flexShrink: 1 },
  error: { color: "#D0342C", fontSize: 12, textAlign: "center", paddingHorizontal: 16, marginBottom: 6 },
});
