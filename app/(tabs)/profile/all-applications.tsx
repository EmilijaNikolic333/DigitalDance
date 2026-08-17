import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MyApplicationCard } from "@/components/my-application-card";
import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";
import { getMyApplications, type MyApplication } from "@/services/applications";

export default function AllApplicationsScreen() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    getMyApplications().then(({ data, error: loadError }) => {
      setApplications(data);
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

        <Text style={styles.title}>Your applications</Text>

        {loading ? (
          <ActivityIndicator size="large" color={palette.text} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>Couldn&apos;t load your applications. Check your connection.</Text>
            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : applications.length === 0 ? (
          <Text style={styles.emptyText}>You haven&apos;t applied to any events yet.</Text>
        ) : (
          <View style={styles.list}>
            {applications.map((application) => (
              <MyApplicationCard
                key={application.id}
                application={application}
                onViewDetails={() =>
                  router.push({ pathname: "/event/[id]", params: { id: application.event_id } })
                }
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
    closeButton: { position: "absolute", top: 16, left: 16 },
    title: { fontSize: 22, fontWeight: "700", color: p.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center", marginTop: 40 },
    list: { width: "100%" },
    errorBox: { alignItems: "center" },
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
