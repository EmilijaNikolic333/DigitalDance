import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { useTheme } from "@/contexts/theme-context";
import { goToUserProfile } from "@/lib/profile-navigation";
import type { Palette } from "@/lib/theme";
import { type BlockedUser, getBlockedUsers, unblockUser } from "@/services/blocks";

export default function BlockedUsersScreen() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    getBlockedUsers().then(({ data, error: loadError }) => {
      setUsers(data);
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

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    const { error: unblockError } = await unblockUser(userId);
    setUnblockingId(null);
    if (unblockError) return;
    setUsers((current) => current.filter((u) => u.id !== userId));
  };

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color={palette.text} />
        </Pressable>

        <Text style={styles.title}>Blocked users</Text>

        {loading ? (
          <ActivityIndicator size="large" color={palette.text} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.emptyText}>Couldn&apos;t load blocked users. Check your connection.</Text>
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>You haven&apos;t blocked anyone.</Text>
        ) : (
          <View style={styles.list}>
            {users.map((user) => (
              <View key={user.id} style={styles.row}>
                <Pressable onPress={() => goToUserProfile(user.id, null)} hitSlop={4}>
                  <Avatar url={user.avatar_url} size={44} />
                </Pressable>
                <Text style={styles.name} numberOfLines={1}>
                  {user.full_name || "Unnamed user"}
                </Text>
                <Pressable
                  style={styles.unblockButton}
                  onPress={() => handleUnblock(user.id)}
                  disabled={unblockingId === user.id}
                >
                  {unblockingId === user.id ? (
                    <ActivityIndicator size="small" color={palette.text} />
                  ) : (
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
    closeButton: { position: "absolute", top: 50, left: 16 },
    title: { fontSize: 22, fontWeight: "700", color: p.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center", marginTop: 20 },
    list: { width: "100%", gap: 8, marginTop: 16 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 12,
    },
    name: { flex: 1, fontSize: 14, fontWeight: "700", color: p.text },
    unblockButton: {
      backgroundColor: p.gradient[0],
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 18,
    },
    unblockButtonText: { fontSize: 12, fontWeight: "700", color: p.text },
  });
}
