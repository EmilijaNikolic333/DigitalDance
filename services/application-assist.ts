import { readFunctionErrorMessage } from "@/lib/edge-function-error";
import { supabase } from "@/lib/supabase";

/** Asks the AI agent to draft a short application message for this event, based on the
 * dancer's profile and the event's requirements - the user can edit it before sending. */
export async function suggestApplicationMessage(eventId: string): Promise<{ message?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("suggest-application-message", {
    body: { eventId },
  });

  if (error) {
    const detail = await readFunctionErrorMessage(error);
    console.error("suggestApplicationMessage failed:", detail, error);
    return { error: detail };
  }

  return { message: data?.message };
}
