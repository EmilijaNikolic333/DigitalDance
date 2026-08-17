import type { EventRating } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

async function getMe() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/** Rates someone (organizer<->dancer) for a specific event, once - errors on a duplicate rating. */
export async function rateForEvent(
  eventId: string,
  rateeId: string,
  rating: number,
  comment: string
): Promise<{ error?: string }> {
  const me = await getMe();
  if (!me) return { error: "Not authenticated" };

  const { error } = await supabase.from("event_ratings").insert({
    event_id: eventId,
    rater_id: me.id,
    ratee_id: rateeId,
    rating,
    comment: comment.trim() || null,
  });

  if (error) {
    console.error("rateForEvent failed:", error.message, error);
    return { error: error.message };
  }
  return {};
}

/** All ratings the current user has given, across every event - keyed by `${eventId}:${rateeId}`. */
export async function getMyGivenRatings(): Promise<Map<string, EventRating>> {
  const me = await getMe();
  const map = new Map<string, EventRating>();
  if (!me) return map;

  const { data } = await supabase.from("event_ratings").select("*").eq("rater_id", me.id);
  for (const row of (data ?? []) as EventRating[]) {
    map.set(`${row.event_id}:${row.ratee_id}`, row);
  }
  return map;
}

/** All ratings the current user has received, across every event - keyed by `${eventId}:${raterId}`. */
export async function getMyReceivedRatings(): Promise<Map<string, EventRating>> {
  const me = await getMe();
  const map = new Map<string, EventRating>();
  if (!me) return map;

  const { data } = await supabase.from("event_ratings").select("*").eq("ratee_id", me.id);
  for (const row of (data ?? []) as EventRating[]) {
    map.set(`${row.event_id}:${row.rater_id}`, row);
  }
  return map;
}

/**
 * Best-effort: for events that have already happened, sends a one-time "rate reminder"
 * notification (to the organizer, and to each accepted dancer) if one hasn't gone out yet.
 * No cron/scheduled job in this backend, so this is called opportunistically on screen load.
 */
export async function sendPendingRateReminders(): Promise<void> {
  const me = await getMe();
  if (!me) return;

  const nowIso = new Date().toISOString();

  try {
    const alreadyNotifiedFor = async (eventId: string) => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", me.id)
        .eq("type", "rate_reminder")
        .eq("reference_id", eventId);
      return !!count;
    };

    // Organizer side: own past events.
    const { data: pastEvents } = await supabase
      .from("events")
      .select("id, title")
      .eq("organizer_id", me.id)
      .lt("event_date", nowIso);

    for (const event of pastEvents ?? []) {
      if (await alreadyNotifiedFor(event.id)) continue;
      await supabase.from("notifications").insert({
        user_id: me.id,
        type: "rate_reminder",
        message: `Rate the dancers you accepted for "${event.title}"`,
        reference_id: event.id,
        is_read: false,
      });
    }

    // Dancer side: accepted applications for events that have already happened.
    const { data: acceptedApps } = await supabase
      .from("applicants")
      .select("event_id")
      .eq("dancer_id", me.id)
      .eq("status", "accepted");

    const acceptedEventIds = [...new Set((acceptedApps ?? []).map((a) => a.event_id))];
    if (acceptedEventIds.length > 0) {
      const { data: pastAcceptedEvents } = await supabase
        .from("events")
        .select("id, title")
        .in("id", acceptedEventIds)
        .lt("event_date", nowIso);

      for (const event of pastAcceptedEvents ?? []) {
        if (await alreadyNotifiedFor(event.id)) continue;
        await supabase.from("notifications").insert({
          user_id: me.id,
          type: "rate_reminder",
          message: `Rate the organizer of "${event.title}"`,
          reference_id: event.id,
          is_read: false,
        });
      }
    }
  } catch (err) {
    // Best-effort - never block the screen it's called from.
    console.error("sendPendingRateReminders failed:", err);
  }
}
