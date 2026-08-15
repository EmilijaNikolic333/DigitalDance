import type { Notification, NotificationType } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

/** All notifications for the current user, newest first. */
export async function getNotifications(): Promise<{ data: Notification[]; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { data: [] };

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getNotifications failed:", error.message, error);
      return { data: [], error: error.message };
    }

    return { data: (data as Notification[]) ?? [] };
  } catch (err) {
    console.error("getNotifications failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Number of unread notifications for the current user - for a badge indicator. */
export async function getUnreadNotificationsCount(): Promise<number> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count ?? 0;
}

export async function markNotificationAsRead(id: string) {
  return supabase.from("notifications").update({ is_read: true }).eq("id", id);
}

/** Creates a notification for `targetUserId`, unless it would be a self-notification. */
export async function notifyUser(
  targetUserId: string,
  type: NotificationType,
  message: string,
  referenceId?: string | null,
  actorId?: string | null
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.id === targetUserId) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: targetUserId,
    type,
    message,
    reference_id: referenceId ?? null,
    actor_id: actorId ?? null,
    is_read: false,
  });

  if (error) {
    // Best-effort - the primary action (like/comment/save/event) already succeeded.
    console.error("notifyUser failed:", error.message, error);
  }
}
