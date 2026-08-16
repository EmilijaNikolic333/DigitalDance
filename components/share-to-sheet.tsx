import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { type ConversationSummary, getConversations, shareEventToUser, shareVideoToUser } from "@/services/messages";

interface ShareToSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pass exactly one of these. */
  videoId?: string;
  eventId?: string;
}

export function ShareToSheet({ visible, onClose, videoId, eventId }: ShareToSheetProps) {
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendingToId, setSendingToId] = useState<string | null>(null);
  const [sentToId, setSentToId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setSentToId(null);
    setLoading(true);
    getConversations().then(({ data, error }) => {
      setConversations(data);
      setLoadError(error ?? null);
      setLoading(false);
    });
  }, [visible]);

  const handleSend = async (otherUserId: string) => {
    setSendingToId(otherUserId);
    const { error } = videoId ? await shareVideoToUser(otherUserId, videoId) : await shareEventToUser(otherUserId, eventId!);
    setSendingToId(null);

    if (error) return;

    setSentToId(otherUserId);
    setTimeout(onClose, 700);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Send to</Text>
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
              data={conversations}
              keyExtractor={(item) => item.otherUserId}
              style={styles.list}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Message someone first to be able to share here.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => handleSend(item.otherUserId)}
                  disabled={sendingToId !== null || sentToId !== null}
                >
                  <Avatar url={item.otherUser?.avatar_url} size={40} />
                  <Text style={styles.name} numberOfLines={1}>
                    {item.otherUser?.full_name || "Unknown"}
                  </Text>
                  {sendingToId === item.otherUserId ? (
                    <ActivityIndicator size="small" color="#C06BE4" />
                  ) : sentToId === item.otherUserId ? (
                    <Ionicons name="checkmark-circle" size={22} color="#2E9E5B" />
                  ) : (
                    <Ionicons name="paper-plane-outline" size={20} color="#C06BE4" />
                  )}
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  name: { fontSize: 14, fontWeight: "700", color: "#093A7D", flex: 1 },
  error: { color: "#D0342C", fontSize: 12, textAlign: "center", paddingHorizontal: 16, marginBottom: 6 },
});
