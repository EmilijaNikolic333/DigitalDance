import type { Event, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type DancerResult = Pick<Profile, "id" | "full_name" | "avatar_url" | "city" | "dance_styles">;
export type OrganizerResult = Pick<Profile, "id" | "full_name" | "avatar_url" | "organization_name" | "city">;
export type EventResult = Pick<Event, "id" | "title" | "description" | "cover_image_url" | "event_date" | "city">;

export interface SearchResults {
  dancers: DancerResult[];
  organizers: OrganizerResult[];
  events: EventResult[];
}

const EMPTY_RESULTS: SearchResults = { dancers: [], organizers: [], events: [] };

/** Searches dancers, organizers, and active events/auditions by name/description. */
export async function search(query: string): Promise<{ data: SearchResults; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { data: EMPTY_RESULTS };

  try {
    // Escape PostgREST's or()-filter special characters so a query containing them doesn't
    // break the pattern into unrelated conditions.
    const pattern = `%${trimmed.replace(/[,()%]/g, "")}%`;

    const [dancersResult, organizersResult, eventsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, dance_styles")
        .eq("is_dancer", true)
        .or(`full_name.ilike.${pattern},bio.ilike.${pattern}`)
        .limit(20),
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, organization_name, city")
        .eq("is_organizer", true)
        .or(`full_name.ilike.${pattern},organization_name.ilike.${pattern},about.ilike.${pattern}`)
        .limit(20),
      supabase
        .from("events")
        .select("id, title, description, cover_image_url, event_date, city")
        .eq("status", "active")
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("event_date", { ascending: true })
        .limit(20),
    ]);

    const error = dancersResult.error ?? organizersResult.error ?? eventsResult.error;
    if (error) {
      console.error("search failed:", error.message, error);
      return { data: EMPTY_RESULTS, error: error.message };
    }

    return {
      data: {
        dancers: (dancersResult.data as DancerResult[]) ?? [],
        organizers: (organizersResult.data as OrganizerResult[]) ?? [],
        events: (eventsResult.data as EventResult[]) ?? [],
      },
    };
  } catch (err) {
    console.error("search failed:", err);
    return { data: EMPTY_RESULTS, error: err instanceof Error ? err.message : "Network error" };
  }
}
