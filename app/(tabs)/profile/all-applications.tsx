import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MyApplicationCard } from "@/components/my-application-card";
import { RateSheet } from "@/components/rate-sheet";
import { useTheme } from "@/contexts/theme-context";
import type { EventRating, Profile } from "@/lib/database.types";
import type { Palette } from "@/lib/theme";
import { getMyApplications, type MyApplication } from "@/services/applications";
import { getMyGivenRatings, getMyReceivedRatings } from "@/services/ratings";
import { supabase } from "@/lib/supabase";

export default function AllApplicationsScreen() {
  const { subTab: subTabParam } = useLocalSearchParams<{ subTab?: string }>();
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [givenRatings, setGivenRatings] = useState<Map<string, EventRating>>(new Map());
  const [receivedRatings, setReceivedRatings] = useState<Map<string, EventRating>>(new Map());
  const [organizersById, setOrganizersById] = useState<Map<string, Pick<Profile, "id" | "full_name" | "avatar_url">>>(
    new Map()
  );
  const [subTab, setSubTab] = useState<"events" | "done">(subTabParam === "done" ? "done" : "events");
  const [rateSheetApp, setRateSheetApp] = useState<MyApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    Promise.all([getMyApplications(), getMyGivenRatings(), getMyReceivedRatings()]).then(
      ([{ data, error: loadError }, given, received]) => {
        setApplications(data);
        setGivenRatings(given);
        setReceivedRatings(received);
        setError(loadError ?? null);
        setLoading(false);
        hasLoadedRef.current = true;

        const now = Date.now();
        const organizerIds = [
          ...new Set(
            data
              .filter((a) => a.status === "accepted" && a.event && new Date(a.event.event_date).getTime() < now)
              .map((a) => a.event!.organizer_id)
          ),
        ];
        if (organizerIds.length > 0) {
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", organizerIds)
            .then(({ data: profiles }) => {
              setOrganizersById(new Map((profiles ?? []).map((o) => [o.id, o])));
            });
        }
      }
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isDone = (a: MyApplication) => !!a.event && new Date(a.event.event_date).getTime() < Date.now();
  const filtered = applications.filter((a) => (subTab === "done" ? isDone(a) : !isDone(a)));

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color={palette.text} />
        </Pressable>

        <Text style={styles.title}>Applications</Text>

        <View style={styles.subTagRow}>
          <Pressable style={[styles.subTag, subTab === "events" && styles.subTagSelected]} onPress={() => setSubTab("events")}>
            <Text style={[styles.subTagText, subTab === "events" && styles.subTagTextSelected]}>Events</Text>
          </Pressable>
          <Pressable style={[styles.subTag, subTab === "done" && styles.subTagSelected]} onPress={() => setSubTab("done")}>
            <Text style={[styles.subTagText, subTab === "done" && styles.subTagTextSelected]}>Done events</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={palette.text} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.emptyText}>Couldn&apos;t load your applications. Check your connection.</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>
            {subTab === "done" ? "No completed applications yet." : "No upcoming applications."}
          </Text>
        ) : (
          <View style={styles.list}>
            {filtered.map((application) => {
              const eventIsPast = application.event ? new Date(application.event.event_date).getTime() < Date.now() : false;
              const canRateOrganizer = application.status === "accepted" && application.event && eventIsPast;
              const alreadyRated =
                canRateOrganizer && application.event
                  ? givenRatings.has(`${application.event.id}:${application.event.organizer_id}`)
                  : false;

              return (
                <MyApplicationCard
                  key={application.id}
                  application={application}
                  onViewDetails={() => router.push({ pathname: "/event/[id]", params: { id: application.event_id } })}
                  rateButton={
                    canRateOrganizer
                      ? {
                          label: alreadyRated ? "View rating" : "Submit rating",
                          onPress: () => setRateSheetApp(application),
                        }
                      : undefined
                  }
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {rateSheetApp?.event ? (
        <RateSheet
          visible={!!rateSheetApp}
          onClose={() => setRateSheetApp(null)}
          title={rateSheetApp.event.title}
          eventId={rateSheetApp.event.id}
          targets={[
            {
              userId: rateSheetApp.event.organizer_id,
              name: organizersById.get(rateSheetApp.event.organizer_id)?.full_name || "Organizer",
              avatar: organizersById.get(rateSheetApp.event.organizer_id)?.avatar_url,
              given: givenRatings.get(`${rateSheetApp.event.id}:${rateSheetApp.event.organizer_id}`),
              received: receivedRatings.get(`${rateSheetApp.event.id}:${rateSheetApp.event.organizer_id}`),
            },
          ]}
          onRated={(userId, rating) =>
            setGivenRatings((current) => new Map(current).set(`${rateSheetApp.event!.id}:${userId}`, rating))
          }
        />
      ) : null}
    </LinearGradient>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
    closeButton: { position: "absolute", top: 16, left: 16 },
    title: { fontSize: 22, fontWeight: "700", color: p.text, marginBottom: 8 },
    subTagRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 4 },
    subTag: {
      borderWidth: 1.5,
      borderColor: p.accent,
      paddingVertical: 5,
      paddingHorizontal: 14,
      borderRadius: 14,
    },
    subTagSelected: { backgroundColor: p.accent },
    subTagText: { fontSize: 11, fontWeight: "700", color: p.accent },
    subTagTextSelected: { color: "#fff" },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center", marginTop: 40 },
    list: { width: "100%" },
  });
}
