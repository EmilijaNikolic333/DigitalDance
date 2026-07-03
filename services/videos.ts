import type { Video } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

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
