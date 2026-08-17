import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";
import { reportContent, type ReportContentType } from "@/services/reports";

export interface ReportableContent {
  type: ReportContentType;
  id: string;
  title: string;
  thumbnail: string | null;
}

interface ReportContentSheetProps {
  visible: boolean;
  onClose: () => void;
  videos: ReportableContent[];
  events: ReportableContent[];
}

/** Lets the viewer pick one of this profile's videos/events and report it to admins for review. */
export function ReportContentSheet({ visible, onClose, videos, events }: ReportContentSheetProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [selected, setSelected] = useState<ReportableContent | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setReason("");
    setSubmitted(false);
  }, [visible]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    const { error } = await reportContent(selected.type, selected.id, reason);
    setSubmitting(false);
    if (error) return;

    setSubmitted(true);
    setTimeout(onClose, 900);
  };

  const items = [...videos, ...events];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>{selected ? "Report content" : "What are you reporting?"}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={palette.text} />
            </Pressable>
          </View>

          {submitted ? (
            <View style={styles.submittedWrap}>
              <Ionicons name="checkmark-circle" size={32} color="#2E9E5B" />
              <Text style={styles.submittedText}>Report sent. Thank you.</Text>
            </View>
          ) : !selected ? (
            <FlatList
              data={items}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>This profile has nothing to report yet.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => setSelected(item)}>
                  <View style={styles.thumb}>
                    {item.thumbnail ? (
                      <Image source={{ uri: item.thumbnail }} style={styles.thumbImage} contentFit="cover" />
                    ) : (
                      <Ionicons name={item.type === "video" ? "videocam" : "calendar"} size={18} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.reasonWrap}>
              <View style={styles.selectedRow}>
                <View style={styles.thumb}>
                  {selected.thumbnail ? (
                    <Image source={{ uri: selected.thumbnail }} style={styles.thumbImage} contentFit="cover" />
                  ) : (
                    <Ionicons name={selected.type === "video" ? "videocam" : "calendar"} size={18} color="#fff" />
                  )}
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {selected.title}
                </Text>
              </View>

              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Why are you reporting this? (optional)"
                placeholderTextColor={palette.textMuted}
                multiline
              />

              <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit report</Text>}
              </Pressable>
            </View>
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
      minHeight: "40%",
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
    list: { flex: 1 },
    listContent: { flexGrow: 1, paddingHorizontal: 20, gap: 4 },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 30 },
    emptyText: { fontSize: 13, color: p.textMuted, textAlign: "center" },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    thumb: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    name: { fontSize: 14, fontWeight: "700", color: p.text, flex: 1 },
    reasonWrap: { paddingHorizontal: 20, gap: 14 },
    selectedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    reasonInput: {
      backgroundColor: p.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: p.text,
      minHeight: 80,
      textAlignVertical: "top",
    },
    submitButton: {
      backgroundColor: "#D0342C",
      paddingVertical: 14,
      borderRadius: 24,
      alignItems: "center",
    },
    submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    submittedWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 8 },
    submittedText: { fontSize: 14, fontWeight: "600", color: p.text },
  });
}
