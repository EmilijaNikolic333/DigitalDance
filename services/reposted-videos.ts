import type { Profile, Video } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { notifyUser } from "@/services/notifications";
import { getCountByVideoId, type OwnVideo } from "@/services/videos";

export type RepostedVideoItem = OwnVideo & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

/**
 * Toggles whether the current user has reposted this video.
 * Pass the video's owner id to notify them when it's newly reposted.
 */
export async function toggleRepostVideo(
  videoId: string,
  videoOwnerId?: string
): Promise<{ reposted: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { reposted: false, error: "Not authenticated" };

    const { data: existing, error: lookupError } = await supabase
      .from("reposted_videos")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("toggleRepostVideo (lookup) failed:", lookupError.message, lookupError);
      return { reposted: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase.from("reposted_videos").delete().eq("id", existing.id);
      if (error) {
        console.error("toggleRepostVideo (delete) failed:", error.message, error);
        return { reposted: true, error: error.message };
      }
      return { reposted: false };
    }

    const { error } = await supabase.from("reposted_videos").insert({ video_id: videoId, user_id: user.id });
    if (error) {
      console.error("toggleRepostVideo (insert) failed:", error.message, error);
      return { reposted: false, error: error.message };
    }

    if (videoOwnerId) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      notifyUser(videoOwnerId, "new_repost", `${profile?.full_name || "Someone"} reposted your video`, videoId, user.id);
    }

    return { reposted: true };
  } catch (err) {
    console.error("toggleRepostVideo failed:", err);
    return { reposted: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

async function fetchRepostedVideos(targetUserId: string): Promise<{ data: RepostedVideoItem[]; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const viewerId = session?.user?.id;

    const { data: repostedRows, error } = await supabase
      .from("reposted_videos")
      .select("video_id")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchRepostedVideos failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!repostedRows || repostedRows.length === 0) return { data: [] };

    const videoIds = repostedRows.map((r) => r.video_id);
    const { data: videos } = await supabase.from("videos").select("*").in("id", videoIds);
    const videoById = new Map(((videos as Video[]) ?? []).map((v) => [v.id, v]));

    // Preserve repost order (most recent first) rather than the videos table's own order.
    const orderedVideos = videoIds.map((id) => videoById.get(id)).filter((v): v is Video => !!v);

    const userIds = [...new Set(orderedVideos.map((v) => v.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const [likesCountByVideo, commentsCountByVideo, savedResult, repostedByViewerResult] = await Promise.all([
      getCountByVideoId("likes", videoIds),
      getCountByVideoId("comments", videoIds),
      viewerId
        ? supabase.from("saved_videos").select("video_id").eq("user_id", viewerId).in("video_id", videoIds)
        : Promise.resolve({ data: [] as { video_id: string }[] }),
      // If viewing your own reposts, they're all already reposted by definition - otherwise
      // check which of these the viewer has separately reposted themselves.
      viewerId && viewerId !== targetUserId
        ? supabase.from("reposted_videos").select("video_id").eq("user_id", viewerId).in("video_id", videoIds)
        : Promise.resolve({ data: null as { video_id: string }[] | null }),
    ]);
    const savedSet = new Set((savedResult.data ?? []).map((r) => r.video_id));
    const repostedByViewerSet = repostedByViewerResult.data
      ? new Set(repostedByViewerResult.data.map((r) => r.video_id))
      : null;

    return {
      data: orderedVideos.map((video) => ({
        ...video,
        author: profileById.get(video.user_id) ?? null,
        likesCount: likesCountByVideo.get(video.id) ?? 0,
        commentsCount: commentsCountByVideo.get(video.id) ?? 0,
        isSaved: savedSet.has(video.id),
        isReposted: repostedByViewerSet ? repostedByViewerSet.has(video.id) : true,
      })),
    };
  } catch (err) {
    console.error("fetchRepostedVideos failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** The current user's reposted videos, most recently reposted first, each with its author's name/avatar. */
export async function getRepostedVideos(): Promise<{ data: RepostedVideoItem[]; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { data: [] };

  return fetchRepostedVideos(user.id);
}

/** A specific user's reposted videos - for viewing their public profile. */
export async function getRepostedVideosByUser(userId: string): Promise<{ data: RepostedVideoItem[]; error?: string }> {
  return fetchRepostedVideos(userId);
}
