import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProfileEventCard } from "@/components/profile-event-card";
import { getMyAppliedEventIds } from "@/services/applications";
import { getSavedEvents, type SavedEventItem } from "@/services/saved-events";

export default function AllSavedEventsScreen() {
  const [events, setEvents] = useState<SavedEventItem[]>([]);
  const [appliedEventIds, setAppliedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    Promise.all([getSavedEvents(), getMyAppliedEventIds()]).then(([{ data, error: loadError }, appliedIds]) => {
      setEvents(data);
      setAppliedEventIds(appliedIds);
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
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>

        <Text style={styles.title}>Saved events</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>Couldn&apos;t load your saved events. Check your connection.</Text>
            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>You haven&apos;t saved any events yet.</Text>
        ) : (
          <View style={styles.list}>
            {events.map((event) => (
              <ProfileEventCard
                key={event.id}
                event={event}
                onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
                isApplied={appliedEventIds.has(event.id)}
                showSaveButton
                isSaved
                onUnsaved={() => setEvents((current) => current.filter((e) => e.id !== event.id))}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
  closeButton: { position: "absolute", top: 16, left: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#093A7D", marginBottom: 8 },
  list: { width: "100%" },
  errorBox: { alignItems: "center", marginTop: 40 },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center" },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#093A7D",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
