import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import type { Message, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { getConversation, markMessagesAsRead, sendMessage } from "@/services/messages";
import { getProfileById } from "@/services/profiles";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    Promise.all([getProfileById(id), getConversation(id), supabase.auth.getUser()]).then(
      ([profileResult, conversationResult, { data: userData }]) => {
        setOtherUser(profileResult.data);
        setMessages(conversationResult.data);
        setLoadError(conversationResult.error ?? profileResult.error ?? null);
        setCurrentUserId(userData.user?.id ?? null);
        setLoading(false);
        markMessagesAsRead(id);
      }
    );
  }, [id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSendError(null);
    setSending(true);
    const { data, error } = await sendMessage(id, trimmed);
    setSending(false);

    if (error || !data) {
      setSendError(error ?? "Couldn't send message");
      return;
    }

    setMessages((current) => [...current, data]);
    setText("");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#093A7D" />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={StyleSheet.absoluteFill} />

      <View
        style={[styles.header, { paddingTop: insets.top + 10 }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#093A7D" />
        </Pressable>
        <Avatar url={otherUser?.avatar_url} size={36} />
        <Text style={styles.headerName} numberOfLines={1}>
          {otherUser?.full_name || "User"}
        </Text>
      </View>

      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Say hello!</Text>}
          renderItem={({ item }) => {
            const isMine = item.sender_id === currentUserId;
            return (
              <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.text}</Text>
                  <View style={styles.bubbleFooter}>
                    <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                      {formatTime(item.sent_at)}
                    </Text>
                    {isMine ? (
                      <Ionicons
                        name={item.read_at ? "checkmark-done" : "checkmark"}
                        size={14}
                        color={item.read_at ? "#fff" : "rgba(255,255,255,0.6)"}
                        style={styles.readTick}
                      />
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {sendError ? <Text style={styles.error}>{sendError}</Text> : null}

        <View style={[styles.inputRow, { paddingBottom: keyboardVisible ? 0 : insets.bottom + 10 }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#9AA5B8"
            multiline
          />
          <Pressable
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !text.trim()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8ECFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerName: { fontSize: 16, fontWeight: "700", color: "#093A7D", flexShrink: 1 },
  body: { flex: 1 },
  list: { flexGrow: 1, padding: 16, gap: 8 },
  emptyText: { fontSize: 13, color: "#9B7FC7", textAlign: "center", marginTop: 40 },
  bubbleRow: { width: "100%", flexDirection: "row", marginBottom: 4 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: { backgroundColor: "#093A7D", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: "#093A7D" },
  bubbleTextMine: { color: "#fff" },
  bubbleFooter: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 3 },
  bubbleTime: { fontSize: 10, color: "#9B7FC7" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  readTick: { marginLeft: 3 },
  error: { color: "#D0342C", fontSize: 12, textAlign: "center", paddingHorizontal: 16, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#093A7D",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
});
