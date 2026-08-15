import type { Event } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import type { EventWithOrganizer } from "@/services/events";
import { notifyUser } from "@/services/notifications";

export type RepostedEventItem = EventWithOrganizer;

/** Toggles whether the current user has reposted this event. Pass `organizerId` to notify the organizer on repost. */
export async function toggleRepostEvent(
  eventId: string,
  organizerId?: string
): Promise<{ reposted: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { reposted: false, error: "Not authenticated" };

    const { data: existing, error: lookupError } = await supabase
      .from("reposted_events")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("toggleRepostEvent (lookup) failed:", lookupError.message, lookupError);
      return { reposted: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase.from("reposted_events").delete().eq("id", existing.id);
      if (error) {
        console.error("toggleRepostEvent (delete) failed:", error.message, error);
        return { reposted: true, error: error.message };
      }
      return { reposted: false };
    }

    const { error } = await supabase.from("reposted_events").insert({ event_id: eventId, user_id: user.id });
    if (error) {
      console.error("toggleRepostEvent (insert) failed:", error.message, error);
      return { reposted: false, error: error.message };
    }

    if (organizerId) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      notifyUser(organizerId, "new_repost", `${profile?.full_name || "Someone"} reposted your event`, eventId, user.id);
    }

    return { reposted: true };
  } catch (err) {
    console.error("toggleRepostEvent failed:", err);
    return { reposted: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

async function fetchRepostedEvents(targetUserId: string): Promise<{ data: RepostedEventItem[]; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const viewerId = session?.user?.id;

    const { data: repostedRows, error } = await supabase
      .from("reposted_events")
      .select("event_id")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchRepostedEvents failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!repostedRows || repostedRows.length === 0) return { data: [] };

    const eventIds = repostedRows.map((r) => r.event_id);
    const { data: events } = await supabase.from("events").select("*").in("id", eventIds);
    const eventById = new Map(((events as Event[]) ?? []).map((e) => [e.id, e]));

    // Preserve repost order (most recent first) rather than the events table's own order.
    const orderedEvents = eventIds.map((id) => eventById.get(id)).filter((e): e is Event => !!e);

    const organizerIds = [...new Set(orderedEvents.map((e) => e.organizer_id))];
    const [{ data: organizers }, savedResult, repostedByViewerResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url, organization_name").in("id", organizerIds),
      viewerId
        ? supabase.from("saved_events").select("event_id").eq("user_id", viewerId).in("event_id", eventIds)
        : Promise.resolve({ data: [] as { event_id: string }[] }),
      // If viewing your own reposts, they're all already reposted by definition - otherwise
      // check which of these the viewer has separately reposted themselves.
      viewerId && viewerId !== targetUserId
        ? supabase.from("reposted_events").select("event_id").eq("user_id", viewerId).in("event_id", eventIds)
        : Promise.resolve({ data: null as { event_id: string }[] | null }),
    ]);
    const organizerById = new Map((organizers ?? []).map((o) => [o.id, o]));
    const savedSet = new Set((savedResult.data ?? []).map((r) => r.event_id));
    const repostedByViewerSet = repostedByViewerResult.data
      ? new Set(repostedByViewerResult.data.map((r) => r.event_id))
      : null;

    return {
      data: orderedEvents.map((event) => ({
        ...event,
        organizer: organizerById.get(event.organizer_id) ?? null,
        isSaved: savedSet.has(event.id),
        isReposted: repostedByViewerSet ? repostedByViewerSet.has(event.id) : true,
      })),
    };
  } catch (err) {
    console.error("fetchRepostedEvents failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** The current user's reposted events, most recently reposted first, each with its organizer's name/avatar. */
export async function getRepostedEvents(): Promise<{ data: RepostedEventItem[]; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { data: [] };

  return fetchRepostedEvents(user.id);
}

/** A specific user's reposted events - for viewing their public profile. */
export async function getRepostedEventsByUser(userId: string): Promise<{ data: RepostedEventItem[]; error?: string }> {
  return fetchRepostedEvents(userId);
}
