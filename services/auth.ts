import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

/**
 * signUp() stores full_name in the auth user's metadata (works even before the
 * user has a session, e.g. while email confirmation is pending). Once a real
 * session exists, backfill it into profiles.full_name if it's still empty.
 */
export async function syncProfileNameFromMetadata(session: Session | null) {
  const fullName = session?.user.user_metadata?.full_name;
  if (!fullName) return;

  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", session!.user.id)
    .single();

  if (!data?.full_name) {
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", session!.user.id);
  }
}
