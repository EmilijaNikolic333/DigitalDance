import * as Location from "expo-location";

import type { Event, EventType, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type EventWithOrganizer = Event & {
  organizer: Pick<Profile, "full_name" | "avatar_url" | "organization_name"> | null;
};

export async function getOwnEvents(): Promise<Event[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", user.id)
    .order("event_date", { ascending: true });

  return (data as Event[]) ?? [];
}

/** All active events for the public feed, soonest first, each with its organizer's name/avatar. */
export async function getActiveEvents(): Promise<EventWithOrganizer[]> {
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "active")
    .order("event_date", { ascending: true });

  if (!events || events.length === 0) return [];

  const organizerIds = [...new Set((events as Event[]).map((e) => e.organizer_id))];
  const { data: organizers } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, organization_name")
    .in("id", organizerIds);

  const organizerById = new Map((organizers ?? []).map((o) => [o.id, o]));

  return (events as Event[]).map((event) => ({
    ...event,
    organizer: organizerById.get(event.organizer_id) ?? null,
  }));
}

export async function getEventById(id: string): Promise<EventWithOrganizer | null> {
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) return null;

  const { data: organizer } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, organization_name")
    .eq("id", (event as Event).organizer_id)
    .single();

  return { ...(event as Event), organizer: organizer ?? null };
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
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  return supabase.from("events").insert({
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
  });
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
