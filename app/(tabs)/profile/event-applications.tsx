import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import type { ApplicantStatus } from "@/lib/database.types";
import {
  type ApplicantWithDancer,
  getApplicationsForEvent,
  updateApplicationStatus,
} from "@/services/applications";
import { getEventById } from "@/services/events";

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

export default function EventApplicationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [applications, setApplications] = useState<ApplicantWithDancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([getEventById(id), getApplicationsForEvent(id)]).then(([event, result]) => {
        if (isActive) {
          setEventTitle(event?.title ?? "");
          setApplications(result.applications);
          setLoadError(result.error ?? null);
          setLoading(false);
        }
      });
      return () => {
        isActive = false;
      };
    }, [id])
  );

  const handleUpdateStatus = async (applicationId: string, status: ApplicantStatus) => {
    setUpdatingId(applicationId);
    const { error } = await updateApplicationStatus(applicationId, status);
    setUpdatingId(null);

    if (!error) {
      setApplications((current) => current.map((a) => (a.id === applicationId ? { ...a, status } : a)));
    }
  };

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>

        <Text style={styles.title}>Applications</Text>
        {eventTitle ? <Text style={styles.subtitle}>{eventTitle}</Text> : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : applications.length === 0 ? (
          <Text style={styles.emptyText}>No applications yet.</Text>
        ) : (
          <View style={styles.list}>
            {applications.map((application) => (
              <View key={application.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Avatar url={application.dancer?.avatar_url} size={44} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.name} numberOfLines={1}>
                      {application.dancer?.full_name || "Dancer"}
                    </Text>
                    <Text
                      style={[
                        styles.statusText,
                        application.status === "accepted" && styles.statusAccepted,
                        application.status === "rejected" && styles.statusRejected,
                      ]}
                    >
                      {STATUS_LABEL[application.status]}
                    </Text>
                  </View>
                </View>

                {application.message ? <Text style={styles.message}>{application.message}</Text> : null}

                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionButton, application.status === "accepted" && styles.actionButtonAccept]}
                    onPress={() => handleUpdateStatus(application.id, "accepted")}
                    disabled={updatingId === application.id}
                  >
                    <Text
                      style={[styles.actionButtonText, application.status === "accepted" && styles.actionButtonTextActive]}
                    >
                      Accept
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, application.status === "rejected" && styles.actionButtonReject]}
                    onPress={() => handleUpdateStatus(application.id, "rejected")}
                    disabled={updatingId === application.id}
                  >
                    <Text
                      style={[styles.actionButtonText, application.status === "rejected" && styles.actionButtonTextActive]}
                    >
                      Reject
                    </Text>
                  </Pressable>
                </View>
              </View>
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
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D" },
  subtitle: { fontSize: 13, color: "#9B7FC7", marginTop: 4, marginBottom: 8, textAlign: "center" },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center", marginTop: 40 },
  errorText: { fontSize: 12, color: "#D0342C", textAlign: "center", marginTop: 12, paddingHorizontal: 16 },
  list: { width: "100%", marginTop: 16 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: "#093A7D" },
  statusText: { fontSize: 12, fontWeight: "700", color: "#C06BE4", marginTop: 2 },
  statusAccepted: { color: "#2E9E5B" },
  statusRejected: { color: "#D0342C" },
  message: { fontSize: 13, color: "#093A7D", lineHeight: 19, marginTop: 10 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#F8ECFF",
  },
  actionButtonAccept: { backgroundColor: "#2E9E5B" },
  actionButtonReject: { backgroundColor: "#D0342C" },
  actionButtonText: { fontSize: 13, fontWeight: "700", color: "#093A7D" },
  actionButtonTextActive: { color: "#fff" },
});
