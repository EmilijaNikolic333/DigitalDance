import type { Profile, Video } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type FeedVideo = Video & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  isFollowingAuthor: boolean;
  isOwnVideo: boolean;
  isSaved: boolean;
};

export type OwnVideo = Video & { likesCount: number; commentsCount: number; isSaved: boolean };

/** Row count per video id, for either the "likes" or "comments" table. */
export async function getCountByVideoId(table: "likes" | "comments", videoIds: string[]): Promise<Map<string, number>> {
  if (videoIds.length === 0) return new Map();

  const { data } = await supabase.from(table).select("video_id").in("video_id", videoIds);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.video_id, (counts.get(row.video_id) ?? 0) + 1);
  }
  return counts;
}

async function fetchVideosWithCounts(userId: string): Promise<{ data: OwnVideo[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchVideosWithCounts failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!data || data.length === 0) return { data: [] };

    const videoIds = (data as Video[]).map((v) => v.id);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const viewerId = session?.user?.id;

    const [likesCountByVideo, commentsCountByVideo, savedResult] = await Promise.all([
      getCountByVideoId("likes", videoIds),
      getCountByVideoId("comments", videoIds),
      viewerId
        ? supabase.from("saved_videos").select("video_id").eq("user_id", viewerId).in("video_id", videoIds)
        : Promise.resolve({ data: [] as { video_id: string }[] }),
    ]);
    const savedSet = new Set((savedResult.data ?? []).map((r) => r.video_id));

    return {
      data: (data as Video[]).map((video) => ({
        ...video,
        likesCount: likesCountByVideo.get(video.id) ?? 0,
        commentsCount: commentsCountByVideo.get(video.id) ?? 0,
        isSaved: savedSet.has(video.id),
      })),
    };
  } catch (err) {
    console.error("fetchVideosWithCounts failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function getOwnVideos(): Promise<{ data: OwnVideo[]; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { data: [] };

  return fetchVideosWithCounts(user.id);
}

/** A specific user's videos - for viewing their public profile. */
export async function getVideosByUser(userId: string): Promise<{ data: OwnVideo[]; error?: string }> {
  return fetchVideosWithCounts(userId);
}

/** All videos for the swipeable feed, newest first, each with its author's name/avatar. */
export async function getFeedVideos(): Promise<{ data: FeedVideo[]; error?: string }> {
  try {
    const { data: videos, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getFeedVideos failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!videos || videos.length === 0) return { data: [] };

    const userIds = [...new Set((videos as Video[]).map((v) => v.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    const videoIds = (videos as Video[]).map((v) => v.id);
    const [{ data: likes }, commentsCountByVideo, { data: followingRows }, { data: savedRows }] = await Promise.all([
      supabase.from("likes").select("video_id, user_id").in("video_id", videoIds),
      getCountByVideoId("comments", videoIds),
      currentUserId
        ? supabase.from("follows").select("following_id").eq("follower_id", currentUserId).in("following_id", userIds)
        : Promise.resolve({ data: [] as { following_id: string }[] }),
      currentUserId
        ? supabase.from("saved_videos").select("video_id").eq("user_id", currentUserId).in("video_id", videoIds)
        : Promise.resolve({ data: [] as { video_id: string }[] }),
    ]);

    const likesCountByVideo = new Map<string, number>();
    const likedByMe = new Set<string>();
    for (const like of likes ?? []) {
      likesCountByVideo.set(like.video_id, (likesCountByVideo.get(like.video_id) ?? 0) + 1);
      if (like.user_id === currentUserId) likedByMe.add(like.video_id);
    }

    const followingSet = new Set((followingRows ?? []).map((f) => f.following_id));
    const savedSet = new Set((savedRows ?? []).map((r) => r.video_id));

    return {
      data: (videos as Video[]).map((video) => ({
        ...video,
        author: profileById.get(video.user_id) ?? null,
        likesCount: likesCountByVideo.get(video.id) ?? 0,
        isLiked: likedByMe.has(video.id),
        commentsCount: commentsCountByVideo.get(video.id) ?? 0,
        isFollowingAuthor: followingSet.has(video.user_id),
        isOwnVideo: video.user_id === currentUserId,
        isSaved: savedSet.has(video.id),
      })),
    };
  } catch (err) {
    console.error("getFeedVideos failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Increments a video's view count regardless of who owns it (see supabase-video-views-function.sql). */
export async function incrementViewCount(videoId: string) {
  await supabase.rpc("increment_video_views", { video_id: videoId });
}

/** Uploads a locally picked video file to the `videos` bucket and returns its public URL. */
export async function uploadVideoFile(userId: string, localUri: string): Promise<{ publicUrl?: string; error?: Error }> {
  try {
    const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());
    const extension = localUri.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("videos").upload(path, arraybuffer, {
      contentType: `video/${extension}`,
    });
    if (uploadError) return { error: uploadError };

    const { data } = supabase.storage.from("videos").getPublicUrl(path);
    return { publicUrl: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Upload failed") };
  }
}

/** Uploads a locally picked cover image to the `videos` bucket and returns its public URL. */
export async function uploadVideoThumbnail(userId: string, localUri: string): Promise<{ publicUrl?: string; error?: Error }> {
  try {
    const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());
    const extension = localUri.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/thumbnails/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("videos").upload(path, arraybuffer, {
      contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
    });
    if (uploadError) return { error: uploadError };

    const { data } = supabase.storage.from("videos").getPublicUrl(path);
    return { publicUrl: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Upload failed") };
  }
}

export async function createVideo(input: {
  description: string;
  dance_style: string;
  video_url: string;
  thumbnail_url: string;
  song_title?: string;
  song_artist?: string;
  song_preview_url?: string;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { error: new Error("Not authenticated") };

  return supabase.from("videos").insert({
    user_id: user.id,
    // `title` is kept in sync in case the column is NOT NULL; the caption itself lives in `description`.
    title: input.description,
    description: input.description,
    dance_style: input.dance_style,
    video_url: input.video_url,
    thumbnail_url: input.thumbnail_url,
    song_title: input.song_title ?? null,
    song_artist: input.song_artist ?? null,
    song_preview_url: input.song_preview_url ?? null,
    views_count: 0,
  });
}

export async function getVideoById(id: string): Promise<Video | null> {
  const { data } = await supabase.from("videos").select("*").eq("id", id).single();
  return (data as Video) ?? null;
}

export async function updateVideo(
  id: string,
  input: {
    description: string;
    dance_style: string;
    thumbnail_url: string;
    song_title?: string;
    song_artist?: string;
    song_preview_url?: string;
  }
) {
  return supabase
    .from("videos")
    .update({
      title: input.description,
      description: input.description,
      dance_style: input.dance_style,
      thumbnail_url: input.thumbnail_url,
      song_title: input.song_title ?? null,
      song_artist: input.song_artist ?? null,
      song_preview_url: input.song_preview_url ?? null,
    })
    .eq("id", id);
}

export async function deleteVideo(id: string) {
  return supabase.from("videos").delete().eq("id", id);
}
