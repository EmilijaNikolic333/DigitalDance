import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export function signUp(
  email: string,
  password: string,
  fullName: string,
  roles: { isDancer: boolean; isOrganizer: boolean }
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        is_dancer: roles.isDancer,
        is_organizer: roles.isOrganizer,
      },
    },
  });
}

export function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function changePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

/**
 * signUp() stores full_name/roles in the auth user's metadata (works even before
 * the user has a session, e.g. while email confirmation is pending). The first
 * time a session becomes available for this account, copy those into the
 * profiles row, then mark the metadata as consumed (`profile_synced`) so later
 * logins never overwrite profile edits the user made in the meantime.
 */
export async function syncProfileFromMetadata(session: Session | null) {
  if (!session) return;

  const meta = session.user.user_metadata;
  if (!meta || meta.profile_synced) return;

  const updates: Record<string, unknown> = {};
  if (meta.full_name) updates.full_name = meta.full_name;
  if (typeof meta.is_dancer === "boolean") updates.is_dancer = meta.is_dancer;
  if (typeof meta.is_organizer === "boolean") updates.is_organizer = meta.is_organizer;

  if (Object.keys(updates).length > 0) {
    await supabase.from("profiles").update(updates).eq("id", session.user.id);
  }

  await supabase.auth.updateUser({ data: { profile_synced: true } });
}
