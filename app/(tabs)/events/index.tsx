import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import MapView, { Marker, type Region } from "react-native-maps";

import { EventCard } from "@/components/event-card";
import { useTheme } from "@/contexts/theme-context";
import { isExpoGo } from "@/lib/is-expo-go";
import type { Palette } from "@/lib/theme";
import { getMyAppliedEventIds } from "@/services/applications";
import { type EventWithOrganizer, getActiveEvents, getRecommendedEvents } from "@/services/events";
import {
  getEventRecommendationsCache,
  isRecommendationsStale,
  refreshEventRecommendations,
} from "@/services/recommendations";

/** Local-time YYYY-MM-DD key, matching how dates are shown elsewhere (device local time, not UTC). */
function toDateKey(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const DEFAULT_REGION: Region = {
  latitude: 44.7866,
  longitude: 20.4489,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function EventsListScreen() {
  const [events, setEvents] = useState<EventWithOrganizer[]>([]);
  const [appliedEventIds, setAppliedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { darkMode, palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [eventsTab, setEventsTab] = useState<"all" | "recommended">("all");
  const [recommendedEvents, setRecommendedEvents] = useState<(EventWithOrganizer & { reason: string })[]>([]);
  const [recommendedLoaded, setRecommendedLoaded] = useState(false);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    Promise.all([getActiveEvents(), getMyAppliedEventIds()]).then(([{ data, error: loadError }, appliedIds]) => {
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

  const loadRecommended = useCallback(async (forceRefresh: boolean) => {
    setRecommendedLoading(true);
    setRecommendedError(null);

    const { updatedAt } = await getEventRecommendationsCache();
    if (forceRefresh || isRecommendationsStale(updatedAt)) {
      setGenerating(true);
      const { error: refreshError } = await refreshEventRecommendations();
      setGenerating(false);
      if (refreshError) {
        setRecommendedError(refreshError);
        setRecommendedLoading(false);
        setRecommendedLoaded(true);
        return;
      }
    }

    const { data, error: loadError } = await getRecommendedEvents();
    setRecommendedEvents(data);
    setRecommendedError(loadError ?? null);
    setRecommendedLoading(false);
    setRecommendedLoaded(true);
  }, []);

  useEffect(() => {
    if (eventsTab === "recommended" && !recommendedLoaded) {
      loadRecommended(false);
    }
  }, [eventsTab, recommendedLoaded, loadRecommended]);

  const eventsWithLocation = events.filter((e) => e.location_lat !== null && e.location_lng !== null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventWithOrganizer[]>();
    for (const event of events) {
      const key = toDateKey(event.event_date);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const markedDates = useMemo(() => {
    const eventDayStyle = { container: { backgroundColor: palette.accent, borderRadius: 16 }, text: { color: "#fff", fontWeight: "700" as const } };
    const selectedDayStyle = { container: { backgroundColor: palette.selectedBg, borderRadius: 16 }, text: { color: palette.selectedText, fontWeight: "700" as const } };

    const marks: Record<string, { customStyles: typeof eventDayStyle }> = {};
    for (const key of eventsByDate.keys()) {
      marks[key] = { customStyles: eventDayStyle };
    }
    if (selectedDate) {
      marks[selectedDate] = { customStyles: selectedDayStyle };
    }
    return marks;
  }, [eventsByDate, selectedDate, palette]);

  const selectedDateEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  const region = useMemo<Region>(() => {
    if (eventsWithLocation.length === 0) return DEFAULT_REGION;

    const lats = eventsWithLocation.map((e) => e.location_lat as number);
    const lngs = eventsWithLocation.map((e) => e.location_lng as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.6),
      longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.6),
    };
  }, [eventsWithLocation]);

  const goToEvent = (id: string) => router.push({ pathname: "/event/[id]", params: { id } });

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={darkMode ? require("@/assets/images/icon-dark.png") : require("@/assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.subtitle}>Find and apply to upcoming auditions and dance workshops!</Text>

        <View style={styles.mapCard}>
          {isExpoGo ? (
            <MapView style={styles.map} region={region}>
              {eventsWithLocation.map((event) => (
                <Marker
                  key={event.id}
                  coordinate={{ latitude: event.location_lat as number, longitude: event.location_lng as number }}
                  onPress={() => goToEvent(event.id)}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={styles.pin}>
                    <View style={styles.pinLabel}>
                      <Text style={styles.pinLabelText} numberOfLines={2}>
                        {event.title}
                      </Text>
                    </View>
                    <Ionicons name="location" size={30} color={palette.accent} />
                  </View>
                </Marker>
              ))}
            </MapView>
          ) : (
            <View style={styles.mapUnavailable}>
              <Ionicons name="map-outline" size={28} color="#fff" />
              <Text style={styles.mapUnavailableText}>Map view unavailable in this build</Text>
            </View>
          )}
        </View>

        <View style={styles.calendarCard}>
          <Calendar
            markingType="custom"
            markedDates={markedDates}
            onDayPress={(day: DateData) => setSelectedDate((current) => (current === day.dateString ? null : day.dateString))}
            theme={{
              backgroundColor: palette.card,
              calendarBackground: palette.card,
              textSectionTitleColor: palette.textMuted,
              dayTextColor: palette.text,
              todayTextColor: palette.accent,
              monthTextColor: palette.text,
              arrowColor: palette.text,
              selectedDayBackgroundColor: palette.selectedBg,
              selectedDayTextColor: palette.selectedText,
              dotColor: palette.accent,
              textDayFontWeight: "600",
              textMonthFontWeight: "700",
            }}
            key={darkMode ? "dark" : "light"}
          />

          {selectedDate ? (
            selectedDateEvents.length === 0 ? (
              <Text style={styles.calendarEmptyText}>No auditions on this day.</Text>
            ) : (
              <View style={styles.calendarEventsList}>
                {selectedDateEvents.map((event) => (
                  <Pressable key={event.id} style={styles.calendarEventRow} onPress={() => goToEvent(event.id)}>
                    <View style={styles.calendarEventCover}>
                      {event.cover_image_url ? (
                        <Image source={{ uri: event.cover_image_url }} style={styles.calendarEventCoverImage} contentFit="cover" />
                      ) : (
                        <Ionicons name="calendar" size={16} color="#fff" />
                      )}
                    </View>
                    <View style={styles.calendarEventInfo}>
                      <Text style={styles.calendarEventTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.calendarEventTime}>{formatEventTime(event.event_date)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                  </Pressable>
                ))}
              </View>
            )
          ) : null}
        </View>

        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, eventsTab === "all" && styles.tabActive]} onPress={() => setEventsTab("all")}>
            <Text style={[styles.tabText, eventsTab === "all" && styles.tabTextActive]}>The Stage</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, eventsTab === "recommended" && styles.tabActive]}
            onPress={() => setEventsTab("recommended")}
          >
            <Text style={[styles.tabText, eventsTab === "recommended" && styles.tabTextActive]}>Your Rhythm</Text>
          </Pressable>
        </View>

        {eventsTab === "all" ? (
          loading ? (
            <ActivityIndicator size="large" color={palette.text} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.emptyText}>Couldn&apos;t load events. Check your connection.</Text>
              <Pressable style={styles.retryButton} onPress={load}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : events.length === 0 ? (
            <Text style={styles.emptyText}>No events yet. Check back soon!</Text>
          ) : (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => goToEvent(event.id)}
                isApplied={appliedEventIds.has(event.id)}
                isSaved={event.isSaved}
                isReposted={event.isReposted}
              />
            ))
          )
        ) : recommendedLoading && !recommendedLoaded ? (
          <View style={styles.errorBox}>
            <ActivityIndicator size="large" color={palette.text} />
            {generating ? <Text style={styles.emptyText}>Your AI agent is picking events for you...</Text> : null}
          </View>
        ) : recommendedError ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>Couldn&apos;t load recommendations: {recommendedError}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadRecommended(true)}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : recommendedEvents.length === 0 ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>
              Save or repost a few events so we can learn what you&apos;re looking for, then check back here.
            </Text>
            <Pressable style={styles.retryButton} onPress={() => loadRecommended(true)}>
              <Text style={styles.retryButtonText}>Refresh</Text>
            </Pressable>
          </View>
        ) : (
          recommendedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => goToEvent(event.id)}
              isApplied={appliedEventIds.has(event.id)}
              isSaved={event.isSaved}
              isReposted={event.isReposted}
              reason={event.reason}
            />
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    container: { alignItems: "center", padding: 20, paddingTop: 60, paddingBottom: 40 },
    logo: { width: "100%", height: 60, marginBottom: 8 },
    subtitle: { fontSize: 13, color: p.textMuted, textAlign: "center", marginBottom: 16, paddingHorizontal: 16 },
    tabRow: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 14 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 18, backgroundColor: p.card, alignItems: "center" },
    tabActive: { backgroundColor: p.selectedBg },
    tabText: { fontSize: 13, fontWeight: "700", color: p.text },
    tabTextActive: { color: p.selectedText },
    mapCard: {
      width: "100%",
      height: 200,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 20,
      borderWidth: 3,
      borderColor: p.card,
    },
    map: { flex: 1 },
    mapUnavailable: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: p.accent,
    },
    mapUnavailableText: { color: "#fff", fontSize: 12, fontWeight: "700", paddingHorizontal: 24, textAlign: "center" },
    calendarCard: {
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 20,
      backgroundColor: p.card,
      borderWidth: 3,
      borderColor: p.card,
    },
    calendarEmptyText: { fontSize: 13, color: p.textMuted, textAlign: "center", paddingVertical: 16 },
    calendarEventsList: { padding: 12, paddingTop: 0, gap: 8 },
    calendarEventRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: p.gradient[0],
      borderRadius: 14,
      padding: 8,
    },
    calendarEventCover: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    calendarEventCoverImage: { width: "100%", height: "100%" },
    calendarEventInfo: { flex: 1, gap: 1 },
    calendarEventTitle: { fontSize: 13, fontWeight: "700", color: p.text },
    calendarEventTime: { fontSize: 11, color: p.textMuted },
    pin: { alignItems: "center" },
    pinLabel: {
      backgroundColor: p.accent,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      maxWidth: 170,
      marginBottom: 3,
    },
    pinLabelText: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center", marginTop: 40 },
    errorBox: { alignItems: "center", marginTop: 40 },
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
