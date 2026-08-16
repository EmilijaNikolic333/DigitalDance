import type { Event, ExperienceLevel, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { getBlockedUserIds } from "@/services/blocks";

export type DancerResult = Pick<Profile, "id" | "full_name" | "avatar_url" | "city" | "dance_styles">;
export type OrganizerResult = Pick<Profile, "id" | "full_name" | "avatar_url" | "organization_name" | "city">;
export type EventResult = Pick<Event, "id" | "title" | "description" | "cover_image_url" | "event_date" | "city">;

export interface SearchResults {
  dancers: DancerResult[];
  organizers: OrganizerResult[];
  events: EventResult[];
}

export interface SearchFilters {
  /** Only affects the dancers section - organizers/events don't have a dance style. */
  danceStyle?: string | null;
  /** Applies to all three sections. */
  city?: string | null;
  /** Only affects the dancers section - organizers/events don't have an experience level. */
  experienceLevel?: ExperienceLevel | null;
}

const EMPTY_RESULTS: SearchResults = { dancers: [], organizers: [], events: [] };

/** Searches dancers, organizers, and active events/auditions by name/description, narrowed by any active filters. */
export async function search(
  query: string,
  filters: SearchFilters = {}
): Promise<{ data: SearchResults; error?: string }> {
  const trimmed = query.trim();
  const city = filters.city?.trim();
  const hasAnyFilter = !!trimmed || !!city || !!filters.danceStyle || !!filters.experienceLevel;
  if (!hasAnyFilter) return { data: EMPTY_RESULTS };

  try {
    const blockedIds = await getBlockedUserIds();
    const blockedList = blockedIds.length > 0 ? `(${blockedIds.join(",")})` : null;

    // Escape PostgREST's or()-filter special characters so a query containing them doesn't
    // break the pattern into unrelated conditions.
    const pattern = trimmed ? `%${trimmed.replace(/[,()%]/g, "")}%` : null;
    const cityPattern = city ? `%${city.replace(/[,()%]/g, "")}%` : null;

    let dancersQuery = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, city, dance_styles")
      .eq("is_dancer", true);
    if (pattern) dancersQuery = dancersQuery.or(`full_name.ilike.${pattern},bio.ilike.${pattern}`);
    if (cityPattern) dancersQuery = dancersQuery.ilike("city", cityPattern);
    if (filters.danceStyle) dancersQuery = dancersQuery.contains("dance_styles", [filters.danceStyle]);
    if (filters.experienceLevel) dancersQuery = dancersQuery.eq("experience_level", filters.experienceLevel);
    if (blockedList) dancersQuery = dancersQuery.not("id", "in", blockedList);

    let organizersQuery = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, organization_name, city")
      .eq("is_organizer", true);
    if (pattern) {
      organizersQuery = organizersQuery.or(
        `full_name.ilike.${pattern},organization_name.ilike.${pattern},about.ilike.${pattern}`
      );
    }
    if (cityPattern) organizersQuery = organizersQuery.ilike("city", cityPattern);
    if (blockedList) organizersQuery = organizersQuery.not("id", "in", blockedList);

    let eventsQuery = supabase
      .from("events")
      .select("id, title, description, cover_image_url, event_date, city, organizer_id")
      .eq("status", "active")
      .eq("is_hidden", false);
    if (pattern) eventsQuery = eventsQuery.or(`title.ilike.${pattern},description.ilike.${pattern}`);
    if (cityPattern) eventsQuery = eventsQuery.ilike("city", cityPattern);
    if (blockedList) eventsQuery = eventsQuery.not("organizer_id", "in", blockedList);

    // A dancer-only filter (style/experience) narrows just the dancers section - organizers and
    // events aren't dropped, since they don't carry those attributes to filter by.
    const [dancersResult, organizersResult, eventsResult] = await Promise.all([
      dancersQuery.limit(20),
      organizersQuery.limit(20),
      eventsQuery.order("event_date", { ascending: true }).limit(20),
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
