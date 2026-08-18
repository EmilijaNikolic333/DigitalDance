import { readFunctionErrorMessage } from "@/lib/edge-function-error";
import { supabase } from "@/lib/supabase";

export interface RankedItem {
  id: string;
  reason: string;
}

const STALE_AFTER_HOURS = 12;

interface RecommendationsRow {
  items: RankedItem[] | null;
  updated_at: string | null;
}

async function getCache(table: "feed_recommendations" | "event_recommendations"): Promise<{
  items: RankedItem[];
  updatedAt: string | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { items: [], updatedAt: null };

  const { data } = await supabase
    .from(table)
    .select("items, updated_at")
    .eq("user_id", userId)
    .maybeSingle<RecommendationsRow>();

  return { items: data?.items ?? [], updatedAt: data?.updated_at ?? null };
}

export function getFeedRecommendationsCache() {
  return getCache("feed_recommendations");
}

export function getEventRecommendationsCache() {
  return getCache("event_recommendations");
}

/** True once cached recommendations are missing entirely, or old enough that it's worth asking
 * the agent to recompute them - keeps the "Recommended" tab feeling current without recomputing
 * (and re-billing the LLM call) on every single visit. */
export function isRecommendationsStale(updatedAt: string | null): boolean {
  if (!updatedAt) return true;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > STALE_AFTER_HOURS * 60 * 60 * 1000;
}

async function refresh(type: "feed" | "events"): Promise<{ error?: string }> {
  const { error } = await supabase.functions.invoke("generate-recommendations", { body: { type } });
  if (error) {
    const detail = await readFunctionErrorMessage(error);
    console.error(`refresh recommendations (${type}) failed:`, detail, error);
    return { error: detail };
  }
  return {};
}

export function refreshFeedRecommendations() {
  return refresh("feed");
}

export function refreshEventRecommendations() {
  return refresh("events");
}
