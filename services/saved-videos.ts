import type { Profile, Video } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { notifyUser } from "@/services/notifications";
import { getCountByVideoId, type OwnVideo } from "@/services/videos";

export type SavedVideoItem = OwnVideo & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

/**
 * Toggles whether the current user has this video saved.
 * Pass the video's owner id to notify them when it's newly saved.
 */
export async function toggleSaveVideo(
  videoId: string,
  videoOwnerId?: string
): Promise<{ saved: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { saved: false, error: "Not authenticated" };

    const { data: existing, error: lookupError } = await supabase
      .from("saved_videos")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("toggleSaveVideo (lookup) failed:", lookupError.message, lookupError);
      return { saved: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase.from("saved_videos").delete().eq("id", existing.id);
      if (error) {
        console.error("toggleSaveVideo (delete) failed:", error.message, error);
        return { saved: true, error: error.message };
      }
      return { saved: false };
    }

    const { error } = await supabase.from("saved_videos").insert({ video_id: videoId, user_id: user.id });
    if (error) {
      console.error("toggleSaveVideo (insert) failed:", error.message, error);
      return { saved: false, error: error.message };
    }

    if (videoOwnerId) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      notifyUser(videoOwnerId, "new_save", `${profile?.full_name || "Someone"} saved your video`, videoId, user.id);
    }

    return { saved: true };
  } catch (err) {
    console.error("toggleSaveVideo failed:", err);
    return { saved: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** The current user's saved videos, most recently saved first, each with its author's name/avatar. */
export async function getSavedVideos(): Promise<{ data: SavedVideoItem[]; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { data: [] };

    const { data: savedRows, error } = await supabase
      .from("saved_videos")
      .select("video_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getSavedVideos failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!savedRows || savedRows.length === 0) return { data: [] };

    const videoIds = savedRows.map((r) => r.video_id);
    const { data: videos } = await supabase.from("videos").select("*").in("id", videoIds);
    const videoById = new Map(((videos as Video[]) ?? []).map((v) => [v.id, v]));

    // Preserve save order (most recent first) rather than the videos table's own order.
    const orderedVideos = videoIds.map((id) => videoById.get(id)).filter((v): v is Video => !!v);

    const userIds = [...new Set(orderedVideos.map((v) => v.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const [likesCountByVideo, commentsCountByVideo] = await Promise.all([
      getCountByVideoId("likes", videoIds),
      getCountByVideoId("comments", videoIds),
    ]);

    return {
      data: orderedVideos.map((video) => ({
        ...video,
        author: profileById.get(video.user_id) ?? null,
        likesCount: likesCountByVideo.get(video.id) ?? 0,
        commentsCount: commentsCountByVideo.get(video.id) ?? 0,
        isSaved: true,
      })),
    };
  } catch (err) {
    console.error("getSavedVideos failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}
