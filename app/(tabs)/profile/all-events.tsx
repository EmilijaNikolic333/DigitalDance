import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProfileEventCard } from "@/components/profile-event-card";
import { useTheme } from "@/contexts/theme-context";
import type { Event } from "@/lib/database.types";
import type { Palette } from "@/lib/theme";
import { getOwnEvents } from "@/services/events";

export default function AllEventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    getOwnEvents().then(({ data, error: loadError }) => {
      setEvents(data);
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
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color={palette.text} />
        </Pressable>

        <Text style={styles.title}>Your events</Text>

        {loading ? (
          <ActivityIndicator size="large" color={palette.text} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>Couldn&apos;t load your events. Check your connection.</Text>
            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {events
              .filter((event) => new Date(event.event_date).getTime() >= Date.now())
              .map((event) => (
                <ProfileEventCard
                  key={event.id}
                  event={event}
                  onEditPress={() => router.push(`/(tabs)/profile/edit-event?id=${event.id}`)}
                  onApplicationsPress={() => router.push(`/(tabs)/profile/event-applications?id=${event.id}`)}
                />
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
    list: { width: "100%" },
    errorBox: { alignItems: "center", marginTop: 40 },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center" },
    retryButton: {
      marginTop: 16,
      backgroundColor: p.buttonBg,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 20,
    },
    retryButtonText: { color: p.buttonText, fontWeight: "700", fontSize: 14 },
  });
}
