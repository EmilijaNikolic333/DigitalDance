import type { Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type FollowUser = Pick<Profile, "id" | "full_name" | "avatar_url">;

async function resolveUsers(ids: string[]): Promise<FollowUser[]> {
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return ids.map((id) => profileById.get(id)).filter((p): p is FollowUser => !!p);
}

/** Whether the current user follows the given user. */
export async function isFollowing(userId: string): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const me = session?.user;
  if (!me) return false;

  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", me.id)
    .eq("following_id", userId)
    .maybeSingle();

  return !!data;
}

/** Follower/following counts for a user's profile. */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

/** Everyone who follows this user, most recent first. */
export async function getFollowers(userId: string): Promise<{ data: FollowUser[]; error?: string }> {
  try {
    const { data: rows, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getFollowers failed:", error.message, error);
      return { data: [], error: error.message };
    }

    return { data: await resolveUsers((rows ?? []).map((r) => r.follower_id)) };
  } catch (err) {
    console.error("getFollowers failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Everyone this user follows, most recent first. */
export async function getFollowing(userId: string): Promise<{ data: FollowUser[]; error?: string }> {
  try {
    const { data: rows, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getFollowing failed:", error.message, error);
      return { data: [], error: error.message };
    }

    return { data: await resolveUsers((rows ?? []).map((r) => r.following_id)) };
  } catch (err) {
    console.error("getFollowing failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Toggles the current user's follow of another user: unfollows if already following, follows otherwise. */
export async function toggleFollow(userId: string): Promise<{ following: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const me = session?.user;
    if (!me) return { following: false, error: "Not authenticated" };

    const { data: existing, error: lookupError } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", me.id)
      .eq("following_id", userId)
      .maybeSingle();

    if (lookupError) {
      console.error("toggleFollow (lookup) failed:", lookupError.message, lookupError);
      return { following: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase.from("follows").delete().eq("id", existing.id);
      if (error) {
        console.error("toggleFollow (delete) failed:", error.message, error);
        return { following: true, error: error.message };
      }
      return { following: false };
    }

    const { error } = await supabase.from("follows").insert({ follower_id: me.id, following_id: userId });
    if (error) {
      console.error("toggleFollow (insert) failed:", error.message, error);
      return { following: false, error: error.message };
    }
    return { following: true };
  } catch (err) {
    console.error("toggleFollow failed:", err);
    return { following: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
