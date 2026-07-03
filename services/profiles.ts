import type { Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export async function getOwnProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}
