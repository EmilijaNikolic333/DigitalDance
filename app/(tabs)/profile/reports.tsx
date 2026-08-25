import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";
import {
  approveReport,
  getHiddenContent,
  getPendingReports,
  rejectReport,
  restoreContent,
  type HiddenContentItem,
  type PendingReport,
} from "@/services/reports";

type ModerationTab = "pending" | "removed";

export default function ReportsScreen() {
  const [tab, setTab] = useState<ModerationTab>("pending");
  const [pending, setPending] = useState<PendingReport[]>([]);
  const [removed, setRemoved] = useState<HiddenContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    Promise.all([getPendingReports(), getHiddenContent()]).then(([pendingResult, removedResult]) => {
      setPending(pendingResult.data);
      setRemoved(removedResult.data);
      setError(pendingResult.error ?? removedResult.error ?? null);
      setLoading(false);
      hasLoadedRef.current = true;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleApprove = (report: PendingReport) => {
    Alert.alert("Remove content", "Are you sure you want to remove this content?", [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: () => applyApprove(report) },
    ]);
  };

  const applyApprove = async (report: PendingReport) => {
    setBusyKey(report.id);
    const { error: approveError } = await approveReport(report);
    setBusyKey(null);
    if (approveError) return;
    setPending((current) => current.filter((r) => r.id !== report.id));
    setRemoved((current) => [
      { type: report.content_type, id: report.content_id, title: report.contentTitle, thumbnail: report.contentThumbnail },
      ...current,
    ]);
  };

  const handleReject = async (report: PendingReport) => {
    setBusyKey(report.id);
    const { error: rejectError } = await rejectReport(report.id);
    setBusyKey(null);
    if (rejectError) return;
    setPending((current) => current.filter((r) => r.id !== report.id));
  };

  const handleRestore = (item: HiddenContentItem) => {
    Alert.alert("Restore content", "Are you sure you want to restore this content?", [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: () => applyRestore(item) },
    ]);
  };

  const applyRestore = async (item: HiddenContentItem) => {
    const key = `${item.type}-${item.id}`;
    setBusyKey(key);
    const { error: restoreError } = await restoreContent(item.type, item.id);
    setBusyKey(null);
    if (restoreError) return;
    setRemoved((current) => current.filter((r) => !(r.type === item.type && r.id === item.id)));
  };

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color={palette.text} />
        </Pressable>

        <Text style={styles.title}>Reported content</Text>

        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === "pending" && styles.tabActive]} onPress={() => setTab("pending")}>
            <Text style={[styles.tabText, tab === "pending" && styles.tabTextActive]}>Pending ({pending.length})</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === "removed" && styles.tabActive]} onPress={() => setTab("removed")}>
            <Text style={[styles.tabText, tab === "removed" && styles.tabTextActive]}>Removed ({removed.length})</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={palette.text} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.emptyText}>Couldn&apos;t load reports. Check your connection.</Text>
        ) : tab === "pending" ? (
          pending.length === 0 ? (
            <Text style={styles.emptyText}>No pending reports.</Text>
          ) : (
            <View style={styles.list}>
              {pending.map((report) => (
                <View key={report.id} style={styles.card}>
                  <Pressable
                    style={styles.cardHeader}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/profile/moderate-preview",
                        params: { type: report.content_type, id: report.content_id },
                      })
                    }
                  >
                    <View style={styles.thumb}>
                      {report.contentThumbnail ? (
                        <Image source={{ uri: report.contentThumbnail }} style={styles.thumbImage} contentFit="cover" />
                      ) : (
                        <Ionicons name={report.content_type === "video" ? "videocam" : "calendar"} size={18} color="#fff" />
                      )}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {report.contentTitle}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {report.content_type} · reported by {report.reporter?.full_name || "someone"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                  </Pressable>

                  {report.reason ? <Text style={styles.reasonText}>&quot;{report.reason}&quot;</Text> : null}

                  <View style={styles.actionsRow}>
                    <Pressable
                      style={styles.rejectButton}
                      onPress={() => handleReject(report)}
                      disabled={busyKey === report.id}
                    >
                      {busyKey === report.id ? (
                        <ActivityIndicator size="small" color={palette.text} />
                      ) : (
                        <Text style={styles.rejectButtonText}>Dismiss</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => handleApprove(report)}
                      disabled={busyKey === report.id}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : removed.length === 0 ? (
          <Text style={styles.emptyText}>Nothing has been removed.</Text>
        ) : (
          <View style={styles.list}>
            {removed.map((item) => {
              const key = `${item.type}-${item.id}`;
              return (
                <View key={key} style={styles.card}>
                  <Pressable
                    style={styles.cardHeader}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/profile/moderate-preview",
                        params: { type: item.type, id: item.id },
                      })
                    }
                  >
                    <View style={styles.thumb}>
                      {item.thumbnail ? (
                        <Image source={{ uri: item.thumbnail }} style={styles.thumbImage} contentFit="cover" />
                      ) : (
                        <Ionicons name={item.type === "video" ? "videocam" : "calendar"} size={18} color="#fff" />
                      )}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardMeta}>{item.type}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                  </Pressable>

                  <Pressable style={styles.restoreButton} onPress={() => handleRestore(item)} disabled={busyKey === key}>
                    {busyKey === key ? (
                      <ActivityIndicator size="small" color={palette.text} />
                    ) : (
                      <Text style={styles.restoreButtonText}>Restore</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
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
    title: { fontSize: 22, fontWeight: "700", color: p.text, marginBottom: 16 },
    tabRow: { flexDirection: "row", gap: 8, width: "100%" },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 18, backgroundColor: p.card, alignItems: "center" },
    tabActive: { backgroundColor: p.selectedBg },
    tabText: { fontSize: 13, fontWeight: "700", color: p.text },
    tabTextActive: { color: p.selectedText },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center", marginTop: 30 },
    list: { width: "100%", gap: 10, marginTop: 16 },
    card: { backgroundColor: p.card, borderRadius: 16, padding: 12, gap: 10 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    thumb: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    cardInfo: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 14, fontWeight: "700", color: p.text },
    cardMeta: { fontSize: 11, color: p.textMuted, textTransform: "capitalize" },
    reasonText: { fontSize: 12, color: p.text, fontStyle: "italic" },
    actionsRow: { flexDirection: "row", gap: 8 },
    rejectButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 18,
      backgroundColor: p.gradient[0],
      alignItems: "center",
    },
    rejectButtonText: { fontSize: 12, fontWeight: "700", color: p.text },
    removeButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 18,
      backgroundColor: "#D0342C",
      alignItems: "center",
    },
    removeButtonText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    restoreButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 18,
      backgroundColor: p.gradient[0],
    },
    restoreButtonText: { fontSize: 12, fontWeight: "700", color: p.text },
  });
}
