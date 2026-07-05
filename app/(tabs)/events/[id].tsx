import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "@/components/avatar";
import type { Applicant } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { applyToEvent, getMyApplication } from "@/services/applications";
import { type EventWithOrganizer, getEventById } from "@/services/events";

const APPLICATION_STATUS_LABEL: Record<string, string> = {
  pending: "Application pending",
  accepted: "Application accepted",
  rejected: "Application rejected",
};

const APPLICATION_STATUS_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  pending: { icon: "time-outline", color: "#093A7D" },
  accepted: { icon: "checkmark-circle", color: "#2E9E5B" },
  rejected: { icon: "close-circle", color: "#D0342C" },
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  audition: "Audition",
  festival: "Festival",
  workshop: "Workshop",
  concert: "Concert",
  music_video: "Music video",
  promotion: "Promotion",
  celebration: "Celebration",
  corporate_event: "Corporate event",
  other: "Other",
};

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return (
    date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
    " at " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventWithOrganizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myApplication, setMyApplication] = useState<Applicant | null>(null);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getEventById(id), getMyApplication(id), supabase.auth.getUser()]).then(
      ([eventData, applicationData, { data: userData }]) => {
        setEvent(eventData);
        setMyApplication(applicationData);
        setCurrentUserId(userData.user?.id ?? null);
        setLoading(false);
      }
    );
  }, [id]);

  const handleApply = async () => {
    setApplyError(null);
    setSubmitting(true);
    const { error } = await applyToEvent(id, message);
    setSubmitting(false);

    if (error) {
      setApplyError(error.message);
      return;
    }

    setShowApplyModal(false);
    setMessage("");
    const updated = await getMyApplication(id);
    setMyApplication(updated);
    Alert.alert("Successfully signed up", "The organizer will review your application.");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#093A7D" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Event not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.cover}>
          {event.cover_image_url ? (
            <Image source={{ uri: event.cover_image_url }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <Ionicons name="calendar" size={48} color="#fff" />
          )}
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={22} color="#093A7D" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          {event.organizer ? (
            <View style={styles.organizerRow}>
              <Avatar url={event.organizer.avatar_url} size={28} />
              <Text style={styles.organizerText}>
                {event.organizer.organization_name || event.organizer.full_name || "Organizer"}
              </Text>
            </View>
          ) : null}

          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color="#C06BE4" />
            <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
          </View>
          {event.city ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color="#C06BE4" />
              <Text style={styles.metaText}>{event.city}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionHeading}>More details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                {event.price === null ? "/" : event.price === 0 ? "Free" : `${event.price} din`}
              </Text>
            </View>
            {event.requirements ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Requirements</Text>
                <Text style={[styles.detailValue, styles.detailValueMultiline]}>{event.requirements}</Text>
              </View>
            ) : null}
          </View>

          {event.organizer_id !== currentUserId ? (
            myApplication ? (
              <View style={styles.appliedBadge}>
                <Ionicons
                  name={APPLICATION_STATUS_STYLE[myApplication.status]?.icon ?? "help-circle-outline"}
                  size={18}
                  color={APPLICATION_STATUS_STYLE[myApplication.status]?.color ?? "#093A7D"}
                />
                <Text
                  style={[
                    styles.appliedText,
                    { color: APPLICATION_STATUS_STYLE[myApplication.status]?.color ?? "#093A7D" },
                  ]}
                >
                  {APPLICATION_STATUS_LABEL[myApplication.status] ?? myApplication.status}
                </Text>
              </View>
            ) : (
              <Pressable style={styles.signUpButton} onPress={() => setShowApplyModal(true)}>
                <Text style={styles.signUpButtonText}>Sign up for the event</Text>
              </Pressable>
            )
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={showApplyModal} transparent animationType="fade" onRequestClose={() => setShowApplyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Pressable onPress={() => setShowApplyModal(false)} style={styles.modalCloseButton} hitSlop={12}>
              <Ionicons name="close" size={22} color="#093A7D" />
            </Pressable>

            <Text style={styles.modalTitle}>Sign up for this event</Text>
            <Text style={styles.modalSubtitle}>Add a message for the organizer (optional).</Text>

            <TextInput
              style={styles.modalInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell the organizer about yourself..."
              placeholderTextColor="#9AA5B8"
              multiline
            />

            {applyError ? <Text style={styles.error}>{applyError}</Text> : null}

            <Pressable style={styles.signUpButton} onPress={handleApply} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpButtonText}>Sign up</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#F8ECFF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8ECFF" },
  notFoundText: { fontSize: 15, color: "#093A7D" },
  container: { paddingBottom: 40 },
  cover: {
    width: "100%",
    height: 240,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { width: "100%", height: "100%" },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
  },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginBottom: 8 },
  organizerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  organizerText: { fontSize: 13, fontWeight: "600", color: "#093A7D" },
  description: { fontSize: 14, color: "#093A7D", lineHeight: 21, marginBottom: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  metaText: { fontSize: 14, color: "#093A7D", fontWeight: "600" },
  sectionHeading: { fontSize: 15, fontWeight: "800", color: "#093A7D", marginTop: 16, marginBottom: 10 },
  detailsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  detailLabel: { fontSize: 13, color: "#9B7FC7", fontWeight: "600" },
  detailValue: { fontSize: 13, color: "#093A7D", fontWeight: "700", flexShrink: 1, textAlign: "right" },
  detailValueMultiline: { textAlign: "left", flex: 1 },
  signUpButton: {
    marginTop: 24,
    backgroundColor: "#C06BE4",
    paddingVertical: 15,
    borderRadius: 28,
    alignItems: "center",
  },
  signUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  appliedBadge: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 28,
  },
  appliedText: { color: "#093A7D", fontWeight: "700", fontSize: 15 },
  error: { color: "#D0342C", fontSize: 13, marginBottom: 12, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 58, 125, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalCloseButton: { position: "absolute", top: 14, left: 14, zIndex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#093A7D", textAlign: "center", marginBottom: 6 },
  modalSubtitle: { fontSize: 12, color: "#9B7FC7", textAlign: "center", marginBottom: 16 },
  modalInput: {
    width: "100%",
    minHeight: 90,
    backgroundColor: "#F8ECFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#093A7D",
    textAlignVertical: "top",
    marginBottom: 16,
  },
});
