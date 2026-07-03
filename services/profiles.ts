import type { ExperienceLevel, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export async function getOwnProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

interface ProfileUpdates {
  full_name?: string;
  city?: string;
  avatar_url?: string;
  bio?: string;
  dance_styles?: string[];
  experience_level?: ExperienceLevel | null;
  availability?: string;
  about?: string;
  organization_name?: string;
  website?: string;
}

export async function updateOwnProfile(updates: ProfileUpdates) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  return supabase.from("profiles").update(updates).eq("id", user.id);
}

/** Uploads a locally picked image to the `avatars` bucket and returns its public URL. */
export async function uploadAvatar(userId: string, localUri: string): Promise<{ publicUrl?: string; error?: Error }> {
  try {
    const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());
    const extension = localUri.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, arraybuffer, {
      contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
      upsert: true,
    });
    if (uploadError) return { error: uploadError };

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately instead of a stale cached one at the same URL.
    return { publicUrl: `${data.publicUrl}?updated=${Date.now()}` };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Upload failed") };
  }
}
