import type { Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type BlockedUser = Pick<Profile, "id" | "full_name" | "avatar_url">;

async function getMe() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/** Blocks a user and unfollows them in both directions. */
export async function blockUser(userId: string): Promise<{ error?: string }> {
  const me = await getMe();
  if (!me) return { error: "Not authenticated" };

  const { error } = await supabase.from("blocked_users").insert({ blocker_id: me.id, blocked_id: userId });
  if (error) {
    console.error("blockUser failed:", error.message, error);
    return { error: error.message };
  }

  await supabase.from("follows").delete().eq("follower_id", me.id).eq("following_id", userId);
  await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", me.id);

  return {};
}

export async function unblockUser(userId: string): Promise<{ error?: string }> {
  const me = await getMe();
  if (!me) return { error: "Not authenticated" };

  const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", me.id).eq("blocked_id", userId);
  if (error) {
    console.error("unblockUser failed:", error.message, error);
    return { error: error.message };
  }
  return {};
}

/** Whether the current user has blocked the given user (not the reverse). */
export async function amIBlocking(userId: string): Promise<boolean> {
  const me = await getMe();
  if (!me) return false;

  const { data } = await supabase
    .from("blocked_users")
    .select("id")
    .eq("blocker_id", me.id)
    .eq("blocked_id", userId)
    .maybeSingle();
  return !!data;
}

/** Whether there's a block between the current user and the given user, in either direction. */
export async function isBlockedEitherWay(userId: string): Promise<boolean> {
  const me = await getMe();
  if (!me) return false;

  const { data } = await supabase
    .from("blocked_users")
    .select("id")
    .or(`and(blocker_id.eq.${me.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${me.id})`)
    .maybeSingle();
  return !!data;
}

/** Everyone involved in a block with the current user, in either direction - for filtering feed/search/events. */
export async function getBlockedUserIds(): Promise<string[]> {
  const me = await getMe();
  if (!me) return [];

  const { data } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${me.id},blocked_id.eq.${me.id}`);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.blocker_id === me.id) ids.add(row.blocked_id);
    if (row.blocked_id === me.id) ids.add(row.blocker_id);
  }
  return [...ids];
}

/** Everyone the current user has blocked, most recently blocked first - for the "Blocked users" screen. */
export async function getBlockedUsers(): Promise<{ data: BlockedUser[]; error?: string }> {
  const me = await getMe();
  if (!me) return { data: [] };

  const { data: rows, error } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", me.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getBlockedUsers failed:", error.message, error);
    return { data: [], error: error.message };
  }

  const ids = (rows ?? []).map((r) => r.blocked_id);
  if (ids.length === 0) return { data: [] };

  const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return { data: ids.map((id) => profileById.get(id)).filter((p): p is BlockedUser => !!p) };
}
