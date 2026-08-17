import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";
import { type ConversationSummary, getConversations } from "@/services/messages";

function formatConversationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function InboxScreen() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    getConversations().then(({ data, error: loadError }) => {
      setConversations(data);
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

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={palette.text} style={styles.centered} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load your inbox. Check your connection.</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No conversations yet.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.otherUserId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.otherUserId } })}
            >
              <Avatar url={item.otherUser?.avatar_url} size={52} />
              <View style={styles.rowInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.otherUser?.full_name || "Unknown"}
                </Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.isMine ? "You: " : ""}
                  {item.lastMessage}
                </Text>
              </View>
              <Text style={styles.time}>{formatConversationTime(item.lastMessageAt)}</Text>
            </Pressable>
          )}
        />
      )}
    </LinearGradient>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: "700", color: p.text },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center" },
    retryButton: {
      marginTop: 16,
      backgroundColor: p.buttonBg,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 20,
    },
    retryButtonText: { color: p.buttonText, fontWeight: "700", fontSize: 14 },
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
    },
    rowInfo: { flex: 1, gap: 2 },
    name: { fontSize: 15, fontWeight: "700", color: p.text },
    preview: { fontSize: 13, color: p.textMuted },
    time: { fontSize: 11, color: p.textMuted, fontWeight: "700" },
  });
}
