import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MyApplicationCard } from "@/components/my-application-card";
import { getMyApplications, type MyApplication } from "@/services/applications";

export default function AllApplicationsScreen() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      getMyApplications().then((data) => {
        if (isActive) {
          setApplications(data);
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

        <Text style={styles.title}>Your applications</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
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

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
  closeButton: { position: "absolute", top: 16, left: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center", marginTop: 40 },
  list: { width: "100%" },
});
