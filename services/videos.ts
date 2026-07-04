import type { Profile, Video } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type FeedVideo = Video & {
  author: Pick<Profile, "full_name" | "avatar_url"> | null;
};

export async function getOwnVideos(): Promise<Video[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("videos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as Video[]) ?? [];
}

/** All videos for the swipeable feed, newest first, each with its author's name/avatar. */
export async function getFeedVideos(): Promise<FeedVideo[]> {
  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (!videos || videos.length === 0) return [];

  const userIds = [...new Set((videos as Video[]).map((v) => v.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (videos as Video[]).map((video) => ({
    ...video,
    author: profileById.get(video.user_id) ?? null,
  }));
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
    data: { user },
  } = await supabase.auth.getUser();
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
