import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { createChannel, supabase } from "@/lib/supabase";
import { requestNotificationPermissions, showLocalNotification } from "@/services/local-notifications";

/**
 * Watches the notifications table in realtime and surfaces new rows as device notifications.
 * This only fires while the app is running (foreground or backgrounded, not fully killed) -
 * there's no real push set up.
 */
export function useNotificationListener(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    requestNotificationPermissions();

    const channel = createChannel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { id: string; message: string | null };
          showLocalNotification("DigitalDance", row.message || "You have a new notification", {
            notificationId: row.id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)/profile/notifications");
    });
    return () => subscription.remove();
  }, []);
}
