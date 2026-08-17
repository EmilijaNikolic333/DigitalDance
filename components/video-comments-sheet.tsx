import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { useTheme } from "@/contexts/theme-context";
import { goToUserProfile } from "@/lib/profile-navigation";
import { supabase } from "@/lib/supabase";
import type { Palette } from "@/lib/theme";
import { addComment, getComments, type CommentWithAuthor, type ThreadedComment } from "@/services/comments";

interface VideoCommentsSheetProps {
  videoId: string;
  visible: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
  videoOwnerId?: string;
}

interface ReplyTarget {
  /** Always the top-level comment id - replies stay a single level deep. */
  parentCommentId: string;
  authorName: string;
}

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function VideoCommentsSheet({
  videoId,
  visible,
  onClose,
  onCommentAdded,
  videoOwnerId,
}: VideoCommentsSheetProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ThreadedComment>>(null);
  const inputRef = useRef<TextInput>(null);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  // Only set when this sheet is opened from a /user/[id] profile screen - lets us avoid
  // re-navigating to the profile you're already looking at.
  const { id: viewingProfileId } = useLocalSearchParams<{ id?: string }>();

  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUserId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    getComments(videoId).then(({ data, error }) => {
      setComments(data);
      setLoadError(error ?? null);
      setLoading(false);
    });
  }, [visible, videoId]);

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

  const startReply = (target: ReplyTarget) => {
    setReplyTarget(target);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSendError(null);
    setSending(true);
    const { data, error } = await addComment(videoId, trimmed, replyTarget?.parentCommentId ?? null, videoOwnerId);
    setSending(false);

    if (error || !data) {
      setSendError(error ?? "Couldn't post comment");
      return;
    }

    if (replyTarget) {
      setComments((current) =>
        current.map((comment) =>
          comment.id === replyTarget.parentCommentId
            ? { ...comment, replies: [...comment.replies, data] }
            : comment
        )
      );
    } else {
      setComments((current) => [...current, { ...data, replies: [] }]);
    }

    setText("");
    setReplyTarget(null);
    onCommentAdded();
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  const openAuthorProfile = (userId: string) => {
    onClose();
    goToUserProfile(userId, currentUserId, viewingProfileId);
  };

  const renderComment = (item: CommentWithAuthor, topLevelId: string, isReply: boolean) => (
    <View style={[styles.commentRow, isReply && styles.replyRow]}>
      <Pressable onPress={() => openAuthorProfile(item.user_id)} hitSlop={4}>
        <Avatar url={item.author?.avatar_url} size={isReply ? 28 : 34} />
      </Pressable>
      <View style={styles.commentBody}>
        <View style={styles.commentHeaderRow}>
          <Pressable onPress={() => openAuthorProfile(item.user_id)} hitSlop={4}>
            <Text style={styles.commentName}>{item.author?.full_name || "Unknown"}</Text>
          </Pressable>
          <Text style={styles.commentTime}>{formatCommentTime(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
        <Pressable
          onPress={() => startReply({ parentCommentId: topLevelId, authorName: item.author?.full_name || "them" })}
          hitSlop={6}
        >
          <Text style={styles.replyButton}>Reply</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>{totalCount === 1 ? "1 comment" : `${totalCount} comments`}</Text>
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
              ref={listRef}
              data={comments}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Be the first to leave a comment!</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View>
                  {renderComment(item, item.id, false)}
                  {item.replies.map((reply) => (
                    <View key={reply.id}>{renderComment(reply, item.id, true)}</View>
                  ))}
                </View>
              )}
            />
          )}

          {sendError ? <Text style={styles.error}>{sendError}</Text> : null}

          {replyTarget ? (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>Replying to {replyTarget.authorName}</Text>
              <Pressable onPress={() => setReplyTarget(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color={palette.textMuted} />
              </Pressable>
            </View>
          ) : null}

          <View
            style={[
              styles.inputRow,
              { paddingBottom: keyboardVisible ? 10 : insets.bottom + 10 },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={replyTarget ? `Reply to ${replyTarget.authorName}...` : "Add a comment..."}
              placeholderTextColor={palette.textMuted}
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
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    listContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { fontSize: 13, color: p.textMuted, textAlign: "center" },
    commentRow: { flexDirection: "row", gap: 10 },
    replyRow: { marginTop: 10, marginLeft: 30 },
    commentBody: { flex: 1 },
    commentHeaderRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    commentName: { fontSize: 13, fontWeight: "700", color: p.text },
    commentTime: { fontSize: 11, color: p.textMuted },
    commentText: { fontSize: 14, color: p.text, marginTop: 2, lineHeight: 19 },
    replyButton: { fontSize: 12, fontWeight: "700", color: p.accent, marginTop: 4 },
    error: { color: "#D0342C", fontSize: 12, textAlign: "center", paddingHorizontal: 16, marginBottom: 6 },
    replyBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: p.card,
      borderRadius: 12,
    },
    replyBannerText: { fontSize: 12, color: p.text, fontWeight: "700" },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: "rgba(192, 107, 228, 0.2)",
    },
    input: {
      flex: 1,
      maxHeight: 90,
      backgroundColor: p.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: p.text,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: { opacity: 0.5 },
  });
}
