import type { Event } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import type { EventWithOrganizer } from "@/services/events";

export type SavedEventItem = EventWithOrganizer;

/** Toggles whether the current user has this event saved. */
export async function toggleSaveEvent(eventId: string): Promise<{ saved: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { saved: false, error: "Not authenticated" };

    const { data: existing, error: lookupError } = await supabase
      .from("saved_events")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("toggleSaveEvent (lookup) failed:", lookupError.message, lookupError);
      return { saved: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase.from("saved_events").delete().eq("id", existing.id);
      if (error) {
        console.error("toggleSaveEvent (delete) failed:", error.message, error);
        return { saved: true, error: error.message };
      }
      return { saved: false };
    }

    const { error } = await supabase.from("saved_events").insert({ event_id: eventId, user_id: user.id });
    if (error) {
      console.error("toggleSaveEvent (insert) failed:", error.message, error);
      return { saved: false, error: error.message };
    }
    return { saved: true };
  } catch (err) {
    console.error("toggleSaveEvent failed:", err);
    return { saved: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** The current user's saved events, most recently saved first, each with its organizer's name/avatar. */
export async function getSavedEvents(): Promise<{ data: SavedEventItem[]; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { data: [] };

    const { data: savedRows, error } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getSavedEvents failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!savedRows || savedRows.length === 0) return { data: [] };

    const eventIds = savedRows.map((r) => r.event_id);
    const { data: events } = await supabase.from("events").select("*").in("id", eventIds);
    const eventById = new Map(((events as Event[]) ?? []).map((e) => [e.id, e]));

    // Preserve save order (most recent first) rather than the events table's own order.
    const orderedEvents = eventIds.map((id) => eventById.get(id)).filter((e): e is Event => !!e);

    const organizerIds = [...new Set(orderedEvents.map((e) => e.organizer_id))];
    const { data: organizers } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, organization_name")
      .in("id", organizerIds);
    const organizerById = new Map((organizers ?? []).map((o) => [o.id, o]));

    return {
      data: orderedEvents.map((event) => ({
        ...event,
        organizer: organizerById.get(event.organizer_id) ?? null,
        isSaved: true,
      })),
    };
  } catch (err) {
    console.error("getSavedEvents failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}
