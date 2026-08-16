import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import MapView, { Marker, type Region } from "react-native-maps";

import { EventCard } from "@/components/event-card";
import { isExpoGo } from "@/lib/is-expo-go";
import { getMyAppliedEventIds } from "@/services/applications";
import { type EventWithOrganizer, getActiveEvents } from "@/services/events";

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
    const eventDayStyle = { container: { backgroundColor: "#C06BE4", borderRadius: 16 }, text: { color: "#fff", fontWeight: "700" as const } };
    const selectedDayStyle = { container: { backgroundColor: "#093A7D", borderRadius: 16 }, text: { color: "#fff", fontWeight: "700" as const } };

    const marks: Record<string, { customStyles: typeof eventDayStyle }> = {};
    for (const key of eventsByDate.keys()) {
      marks[key] = { customStyles: eventDayStyle };
    }
    if (selectedDate) {
      marks[selectedDate] = { customStyles: selectedDayStyle };
    }
    return marks;
  }, [eventsByDate, selectedDate]);

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
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />
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
                    <Ionicons name="location" size={30} color="#C06BE4" />
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
              backgroundColor: "#fff",
              calendarBackground: "#fff",
              textSectionTitleColor: "#9B7FC7",
              dayTextColor: "#093A7D",
              todayTextColor: "#C06BE4",
              monthTextColor: "#093A7D",
              arrowColor: "#093A7D",
              selectedDayBackgroundColor: "#093A7D",
              selectedDayTextColor: "#fff",
              dotColor: "#C06BE4",
              textDayFontWeight: "600",
              textMonthFontWeight: "700",
            }}
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
                    <Ionicons name="chevron-forward" size={18} color="#9B7FC7" />
                  </Pressable>
                ))}
              </View>
            )
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
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
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { alignItems: "center", padding: 20, paddingTop: 60, paddingBottom: 40 },
  logo: { width: "100%", height: 60, marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#9B7FC7", textAlign: "center", marginBottom: 16, paddingHorizontal: 16 },
  mapCard: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },
  map: { flex: 1 },
  mapUnavailable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C06BE4",
  },
  mapUnavailableText: { color: "#fff", fontSize: 12, fontWeight: "700", paddingHorizontal: 24, textAlign: "center" },
  calendarCard: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#fff",
  },
  calendarEmptyText: { fontSize: 13, color: "#9B7FC7", textAlign: "center", paddingVertical: 16 },
  calendarEventsList: { padding: 12, paddingTop: 0, gap: 8 },
  calendarEventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8ECFF",
    borderRadius: 14,
    padding: 8,
  },
  calendarEventCover: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  calendarEventCoverImage: { width: "100%", height: "100%" },
  calendarEventInfo: { flex: 1, gap: 1 },
  calendarEventTitle: { fontSize: 13, fontWeight: "700", color: "#093A7D" },
  calendarEventTime: { fontSize: 11, color: "#9B7FC7" },
  pin: { alignItems: "center" },
  pinLabel: {
    backgroundColor: "#C06BE4",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    maxWidth: 170,
    marginBottom: 3,
  },
  pinLabelText: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center", marginTop: 40 },
  errorBox: { alignItems: "center", marginTop: 40 },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#093A7D",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
