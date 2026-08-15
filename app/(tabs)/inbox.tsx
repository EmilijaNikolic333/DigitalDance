import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
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
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#093A7D" style={styles.centered} />
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

const styles = StyleSheet.create({
  background: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#093A7D" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center" },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#093A7D",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: "#093A7D" },
  preview: { fontSize: 13, color: "#9B7FC7" },
  time: { fontSize: 11, color: "#9B7FC7", fontWeight: "700" },
});
