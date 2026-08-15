import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { Notification, NotificationType } from "@/lib/database.types";
import { goToUserProfile } from "@/lib/profile-navigation";
import { getApplicantById } from "@/services/applications";
import { getEventById } from "@/services/events";
import { getMessageById } from "@/services/messages";
import { getNotifications, markNotificationAsRead } from "@/services/notifications";
import { getProfileById } from "@/services/profiles";
import { getVideoById } from "@/services/videos";

const ICON_BY_TYPE: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  new_like: "heart",
  new_comment: "chatbubble-ellipses",
  new_save: "bookmark",
  new_event: "calendar",
  new_message: "mail",
  new_follower: "person-add",
  application_status: "checkmark-circle",
  new_applicant: "person",
};

function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getNotifications().then(({ data, error: loadError }) => {
      setNotifications(data);
      setError(loadError ?? null);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePress = async (notification: Notification) => {
    if (!notification.is_read) {
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      markNotificationAsRead(notification.id);
    }

    if (!notification.reference_id) return;

    switch (notification.type) {
      case "new_event":
        router.push({ pathname: "/event/[id]", params: { id: notification.reference_id } });
        break;
      case "application_status": {
        // reference_id is the application's id, not the event's - resolve the event through it.
        const applicant = await getApplicantById(notification.reference_id);
        if (applicant) {
          router.push({ pathname: "/event/[id]", params: { id: applicant.event_id } });
        }
        break;
      }
      case "new_message": {
        // reference_id is the message's id - the sender is always the other person in the chat.
        const message = await getMessageById(notification.reference_id);
        // This screen is a modal - /chat isn't, so close the modal first or the chat
        // screen renders behind it instead of on top.
        router.back();
        if (message) {
          router.push({ pathname: "/chat/[id]", params: { id: message.sender_id } });
        } else {
          router.push("/(tabs)/inbox");
        }
        break;
      }
      case "new_like": {
        const video = await getVideoById(notification.reference_id);
        if (!video) break;

        // Show who liked it, so it's clear whose profile a tap on the heart leads to.
        const liker = notification.actor_id ? (await getProfileById(notification.actor_id)).data : null;

        // Stay inside the profile tab's own stack (this screen is nested in it) so closing
        // the player returns here instead of jumping out to the Feed tab.
        router.push({
          pathname: "/(tabs)/profile/watch",
          params: {
            url: video.video_url,
            actorId: liker?.id,
            actorName: liker?.full_name ?? undefined,
            actorAvatar: liker?.avatar_url ?? undefined,
            actorIcon: "heart",
          },
        });
        break;
      }
      case "new_comment": {
        const video = await getVideoById(notification.reference_id);
        // Open the video with its comments already showing, so it's clear which video the comment was on.
        if (video) {
          router.push({
            pathname: "/(tabs)/profile/watch",
            params: { url: video.video_url, videoId: video.id, ownerId: video.user_id, showComments: "1" },
          });
        }
        break;
      }
      case "new_save": {
        // reference_id can be a video or an event - try video first, then fall back to event.
        const video = await getVideoById(notification.reference_id);
        if (video) {
          // Show who saved it, so it's clear whose profile a tap on the bookmark leads to.
          const saver = notification.actor_id ? (await getProfileById(notification.actor_id)).data : null;
          router.push({
            pathname: "/(tabs)/profile/watch",
            params: {
              url: video.video_url,
              actorId: saver?.id,
              actorName: saver?.full_name ?? undefined,
              actorAvatar: saver?.avatar_url ?? undefined,
              actorIcon: "bookmark",
            },
          });
          break;
        }
        const event = await getEventById(notification.reference_id);
        if (event) router.push({ pathname: "/event/[id]", params: { id: event.id } });
        break;
      }
      case "new_applicant":
        router.push({ pathname: "/(tabs)/profile/event-applications", params: { id: notification.reference_id } });
        break;
      case "new_follower":
        // reference_id is the new follower's id.
        goToUserProfile(notification.reference_id);
        break;
      default:
        break;
    }
  };

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#093A7D" style={styles.centered} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load your notifications. Check your connection.</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, !item.is_read && styles.rowUnread]}
              onPress={() => handlePress(item)}
            >
              <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
                <Ionicons
                  name={ICON_BY_TYPE[item.type] ?? "notifications"}
                  size={18}
                  color={item.is_read ? "#9B7FC7" : "#fff"}
                />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.message, !item.is_read && styles.messageUnread]} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={styles.time}>{formatNotificationTime(item.created_at)}</Text>
              </View>
              {!item.is_read ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          )}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  closeButton: { position: "absolute", top: 16, left: 16, zIndex: 1 },
  title: { fontSize: 22, fontWeight: "700", color: "#093A7D" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center" },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#093A7D",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  rowUnread: { backgroundColor: "#EAD9FF" },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapUnread: { backgroundColor: "#C06BE4" },
  rowInfo: { flex: 1, gap: 3 },
  message: { fontSize: 13, color: "#093A7D" },
  messageUnread: { fontWeight: "700" },
  time: { fontSize: 11, color: "#9B7FC7", fontWeight: "700" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#C06BE4" },
});
