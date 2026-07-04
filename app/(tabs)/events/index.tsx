import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { EventCard } from "@/components/event-card";
import { type EventWithOrganizer, getActiveEvents } from "@/services/events";

const DEFAULT_REGION: Region = {
  latitude: 44.7866,
  longitude: 20.4489,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function EventsListScreen() {
  const [events, setEvents] = useState<EventWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      getActiveEvents().then((data) => {
        if (isActive) {
          setEvents(data);
          setLoading(false);
        }
      });
      return () => {
        isActive = false;
      };
    }, [])
  );

  const eventsWithLocation = events.filter((e) => e.location_lat !== null && e.location_lng !== null);

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

  const goToEvent = (id: string) => router.push({ pathname: "/(tabs)/events/[id]", params: { id } });

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />
        <Text style={styles.subtitle}>Find and apply to upcoming auditions and dance workshops!</Text>

        <View style={styles.mapCard}>
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
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>No events yet. Check back soon!</Text>
        ) : (
          events.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => goToEvent(event.id)} />
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
});
