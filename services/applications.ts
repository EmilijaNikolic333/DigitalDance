import type { Applicant } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

/** The current dancer's application for a given event, if any. */
export async function getMyApplication(eventId: string): Promise<Applicant | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("applicants")
    .select("*")
    .eq("event_id", eventId)
    .eq("dancer_id", user.id)
    .maybeSingle();

  return (data as Applicant) ?? null;
}

export async function applyToEvent(eventId: string, message: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  return supabase.from("applicants").insert({
    event_id: eventId,
    dancer_id: user.id,
    message: message.trim() || null,
    status: "pending",
  });
}
