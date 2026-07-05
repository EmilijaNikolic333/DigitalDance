import type { Applicant, ApplicantStatus, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type ApplicantWithDancer = Applicant & {
  dancer: Pick<Profile, "full_name" | "avatar_url"> | null;
};

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

/** All applications for an event (organizer view), newest first, each with the dancer's name/avatar. */
export async function getApplicationsForEvent(
  eventId: string
): Promise<{ applications: ApplicantWithDancer[]; error?: string }> {
  const { data: applicants, error } = await supabase.from("applicants").select("*").eq("event_id", eventId);

  if (error) {
    console.error("getApplicationsForEvent failed:", error.message, error);
    return { applications: [], error: error.message };
  }
  if (!applicants || applicants.length === 0) return { applications: [] };

  const dancerIds = [...new Set((applicants as Applicant[]).map((a) => a.dancer_id))];
  const { data: dancers, error: dancersError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", dancerIds);

  if (dancersError) {
    console.error("getApplicationsForEvent (dancer lookup) failed:", dancersError.message, dancersError);
  }

  const dancerById = new Map((dancers ?? []).map((d) => [d.id, d]));

  return {
    applications: (applicants as Applicant[]).map((applicant) => ({
      ...applicant,
      dancer: dancerById.get(applicant.dancer_id) ?? null,
    })),
  };
}

export async function updateApplicationStatus(applicationId: string, status: ApplicantStatus) {
  return supabase.from("applicants").update({ status }).eq("id", applicationId);
}
