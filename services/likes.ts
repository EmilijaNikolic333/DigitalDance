import { supabase } from "@/lib/supabase";

/** Toggles the current user's like on a video: removes it if already liked, adds it otherwise. */
export async function toggleLike(videoId: string): Promise<{ liked: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { liked: false, error: "Not authenticated" };

    const { data: existing, error: lookupError } = await supabase
      .from("likes")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("toggleLike (lookup) failed:", lookupError.message, lookupError);
      return { liked: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase.from("likes").delete().eq("id", existing.id);
      if (error) {
        console.error("toggleLike (delete) failed:", error.message, error);
        return { liked: true, error: error.message };
      }
      return { liked: false };
    }

    const { error } = await supabase.from("likes").insert({ video_id: videoId, user_id: user.id });
    if (error) {
      console.error("toggleLike (insert) failed:", error.message, error);
      return { liked: false, error: error.message };
    }
    return { liked: true };
  } catch (err) {
    console.error("toggleLike failed:", err);
    return { liked: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
