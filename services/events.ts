import * as Location from "expo-location";

import type { Event, EventType, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { getBlockedUserIds } from "@/services/blocks";

export type EventWithOrganizer = Event & {
  organizer: Pick<Profile, "id" | "full_name" | "avatar_url" | "organization_name"> | null;
  isSaved: boolean;
  isReposted: boolean;
};

export type OwnEvent = Event & { isSaved: boolean; isReposted: boolean };

async function fetchEventsByOrganizer(organizerId: string): Promise<{ data: OwnEvent[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", organizerId)
      .eq("is_hidden", false)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("fetchEventsByOrganizer failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!data || data.length === 0) return { data: [] };

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const viewerId = session?.user?.id;

    const eventIds = (data as Event[]).map((e) => e.id);
    const [savedResult, repostedResult] = await Promise.all([
      viewerId
        ? supabase.from("saved_events").select("event_id").eq("user_id", viewerId).in("event_id", eventIds)
        : Promise.resolve({ data: [] as { event_id: string }[] }),
      viewerId
        ? supabase.from("reposted_events").select("event_id").eq("user_id", viewerId).in("event_id", eventIds)
        : Promise.resolve({ data: [] as { event_id: string }[] }),
    ]);
    const savedSet = new Set((savedResult.data ?? []).map((r) => r.event_id));
    const repostedSet = new Set((repostedResult.data ?? []).map((r) => r.event_id));

    return {
      data: (data as Event[]).map((event) => ({
        ...event,
        isSaved: savedSet.has(event.id),
        isReposted: repostedSet.has(event.id),
      })),
    };
  } catch (err) {
    console.error("fetchEventsByOrganizer failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function getOwnEvents(): Promise<{ data: OwnEvent[]; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { data: [] };

  return fetchEventsByOrganizer(user.id);
}

/** A specific organizer's events - for viewing their public profile. */
export async function getEventsByOrganizer(organizerId: string): Promise<{ data: OwnEvent[]; error?: string }> {
  return fetchEventsByOrganizer(organizerId);
}

/** All active events for the public feed, soonest first, each with its organizer's name/avatar. */
export async function getActiveEvents(): Promise<{ data: EventWithOrganizer[]; error?: string }> {
  try {
    const blockedIds = await getBlockedUserIds();

    let query = supabase
      .from("events")
      .select("*")
      .eq("status", "active")
      .eq("is_hidden", false)
      .order("event_date", { ascending: true });
    if (blockedIds.length > 0) query = query.not("organizer_id", "in", `(${blockedIds.join(",")})`);
    const { data: events, error } = await query;

    if (error) {
      console.error("getActiveEvents failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!events || events.length === 0) return { data: [] };

    const organizerIds = [...new Set((events as Event[]).map((e) => e.organizer_id))];
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const viewerId = session?.user?.id;

    const eventIds = (events as Event[]).map((e) => e.id);
    const [{ data: organizers }, savedResult, repostedResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url, organization_name").in("id", organizerIds),
      viewerId
        ? supabase.from("saved_events").select("event_id").eq("user_id", viewerId).in("event_id", eventIds)
        : Promise.resolve({ data: [] as { event_id: string }[] }),
      viewerId
        ? supabase.from("reposted_events").select("event_id").eq("user_id", viewerId).in("event_id", eventIds)
        : Promise.resolve({ data: [] as { event_id: string }[] }),
    ]);

    const organizerById = new Map((organizers ?? []).map((o) => [o.id, o]));
    const savedSet = new Set((savedResult.data ?? []).map((r) => r.event_id));
    const repostedSet = new Set((repostedResult.data ?? []).map((r) => r.event_id));

    return {
      data: (events as Event[]).map((event) => ({
        ...event,
        organizer: organizerById.get(event.organizer_id) ?? null,
        isSaved: savedSet.has(event.id),
        isReposted: repostedSet.has(event.id),
      })),
    };
  } catch (err) {
    console.error("getActiveEvents failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function getEventById(id: string): Promise<EventWithOrganizer | null> {
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event || (event as Event).is_hidden) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const viewerId = session?.user?.id;

  const [{ data: organizer }, savedRow, repostedRow] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, organization_name").eq("id", (event as Event).organizer_id).single(),
    viewerId
      ? supabase.from("saved_events").select("id").eq("user_id", viewerId).eq("event_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewerId
      ? supabase.from("reposted_events").select("id").eq("user_id", viewerId).eq("event_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...(event as Event),
    organizer: organizer ?? null,
    isSaved: !!savedRow.data,
    isReposted: !!repostedRow.data,
  };
}

/** Uploads a locally picked cover image to the `events` bucket and returns its public URL. */
export async function uploadEventCover(userId: string, localUri: string): Promise<{ publicUrl?: string; error?: Error }> {
  try {
    const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());
    const extension = localUri.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("events").upload(path, arraybuffer, {
      contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
    });
    if (uploadError) return { error: uploadError };

    const { data } = supabase.storage.from("events").getPublicUrl(path);
    return { publicUrl: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Upload failed") };
  }
}

export interface GeocodedPlace {
  /** Full readable label, e.g. "Knez Mihailova 5, Belgrade" - shown to the user and stored as events.city. */
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

/** Turns a free-text search query into a place with coordinates using the device's native geocoder. */
export async function searchPlace(query: string): Promise<GeocodedPlace | null> {
  if (!query.trim()) return null;

  const results = await Location.geocodeAsync(query);
  if (results.length === 0) return null;

  const { latitude, longitude } = results[0];
  return reverseGeocode(latitude, longitude, query);
}

/** Resolves a readable "street, city" label for a given coordinate (falls back to the raw query text). */
export async function reverseGeocode(latitude: number, longitude: number, fallback: string): Promise<GeocodedPlace> {
  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  const city = place?.city || place?.subregion || place?.region || fallback;
  const street = place?.street ? `${place.street}${place.streetNumber ? " " + place.streetNumber : ""}` : null;
  const address = street ? `${street}, ${city}` : city;
  return { address, city, latitude, longitude };
}

export async function createEvent(input: {
  title: string;
  description: string;
  event_type: EventType;
  city: string;
  location_lat: number;
  location_lng: number;
  event_date: string;
  requirements: string;
  cover_image_url: string | null;
  price: number | null;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { error: new Error("Not authenticated") };

  const { data: inserted, error } = await supabase
    .from("events")
    .insert({
      organizer_id: user.id,
      title: input.title,
      description: input.description,
      event_type: input.event_type,
      city: input.city,
      location_lat: input.location_lat,
      location_lng: input.location_lng,
      event_date: input.event_date,
      requirements: input.requirements,
      cover_image_url: input.cover_image_url,
      price: input.price,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { error };

  // Notify every dancer about the new event - best-effort, doesn't block event creation.
  const { data: dancers } = await supabase.from("profiles").select("id").eq("is_dancer", true).neq("id", user.id);
  if (dancers && dancers.length > 0 && inserted) {
    const { error: notifyError } = await supabase.from("notifications").insert(
      dancers.map((dancer) => ({
        user_id: dancer.id,
        type: "new_event" as const,
        message: `New event posted: ${input.title}`,
        reference_id: inserted.id,
        is_read: false,
      }))
    );
    if (notifyError) {
      console.error("createEvent (notify dancers) failed:", notifyError.message, notifyError);
    }
  }

  return { data: inserted };
}

export async function updateEvent(
  id: string,
  input: {
    title: string;
    description: string;
    event_type: EventType;
    city: string;
    location_lat: number;
    location_lng: number;
    event_date: string;
    requirements: string;
    cover_image_url: string | null;
    price: number | null;
  }
) {
  return supabase
    .from("events")
    .update({
      title: input.title,
      description: input.description,
      event_type: input.event_type,
      city: input.city,
      location_lat: input.location_lat,
      location_lng: input.location_lng,
      event_date: input.event_date,
      requirements: input.requirements,
      cover_image_url: input.cover_image_url,
      price: input.price,
    })
    .eq("id", id);
}

export async function deleteEvent(id: string) {
  return supabase.from("events").delete().eq("id", id);
}
