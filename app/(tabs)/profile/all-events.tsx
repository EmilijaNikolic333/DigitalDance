import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProfileEventCard } from "@/components/profile-event-card";
import type { Event } from "@/lib/database.types";
import { getOwnEvents } from "@/services/events";

export default function AllEventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      getOwnEvents().then((data) => {
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

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>

        <Text style={styles.title}>Your events</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {events.map((event) => (
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

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
  closeButton: { position: "absolute", top: 16, left: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginBottom: 8 },
  list: { width: "100%" },
});
