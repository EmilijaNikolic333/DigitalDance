import type { Comment, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { notifyUser } from "@/services/notifications";

export type CommentWithAuthor = Comment & {
  author: Pick<Profile, "full_name" | "avatar_url"> | null;
};

export type ThreadedComment = CommentWithAuthor & { replies: CommentWithAuthor[] };

/** All comments on a video as threads: top-level comments, oldest first, each with its replies (also oldest first). */
export async function getComments(videoId: string): Promise<{ data: ThreadedComment[]; error?: string }> {
  try {
    const { data: comments, error } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getComments failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!comments || comments.length === 0) return { data: [] };

    const userIds = [...new Set((comments as Comment[]).map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const withAuthor: CommentWithAuthor[] = (comments as Comment[]).map((comment) => ({
      ...comment,
      author: profileById.get(comment.user_id) ?? null,
    }));

    const repliesByParent = new Map<string, CommentWithAuthor[]>();
    for (const comment of withAuthor) {
      if (!comment.parent_comment_id) continue;
      const replies = repliesByParent.get(comment.parent_comment_id) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parent_comment_id, replies);
    }

    const topLevel = withAuthor
      .filter((c) => !c.parent_comment_id)
      .map((comment) => ({ ...comment, replies: repliesByParent.get(comment.id) ?? [] }));

    return { data: topLevel };
  } catch (err) {
    console.error("getComments failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Posts a comment (or a reply, when `parentCommentId` is given) and returns it with the
 * current user's name/avatar attached. Replies always attach to the top-level comment id,
 * even when replying to another reply, so threads stay a single level deep. Pass the
 * video's owner id to notify them about the new comment.
 */
export async function addComment(
  videoId: string,
  text: string,
  parentCommentId?: string | null,
  videoOwnerId?: string
): Promise<{ data?: CommentWithAuthor; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { error: "Not authenticated" };

    const trimmed = text.trim();
    if (!trimmed) return { error: "Comment can't be empty" };

    const { data: inserted, error } = await supabase
      .from("comments")
      .insert({
        video_id: videoId,
        user_id: user.id,
        text: trimmed,
        parent_comment_id: parentCommentId ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("addComment failed:", error.message, error);
      return { error: error.message };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (videoOwnerId) {
      notifyUser(
        videoOwnerId,
        "new_comment",
        `${profile?.full_name || "Someone"} commented on your video`,
        videoId,
        user.id
      );
    }

    return { data: { ...(inserted as Comment), author: profile ?? null } };
  } catch (err) {
    console.error("addComment failed:", err);
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}
