import type { Event, Message, Profile, Video } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export interface ConversationSummary {
  otherUserId: string;
  otherUser: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  lastMessage: string;
  lastMessageAt: string;
  isMine: boolean;
}

export type SharedVideoPreview = Pick<Video, "id" | "video_url" | "thumbnail_url" | "description">;
export type SharedEventPreview = Pick<Event, "id" | "title" | "cover_image_url">;

export type ConversationMessage = Message & {
  sharedVideo?: SharedVideoPreview | null;
  sharedEvent?: SharedEventPreview | null;
};

/** Best-effort "you got a message" notification - shared by sendMessage and the share-to-chat helpers. */
async function notifyNewMessage(receiverId: string, messageId: string, senderId: string) {
  const { data: senderProfile } = await supabase.from("profiles").select("full_name").eq("id", senderId).single();

  const { error } = await supabase.from("notifications").insert({
    user_id: receiverId,
    type: "new_message",
    reference_id: messageId,
    message: `${senderProfile?.full_name || "Someone"} sent you a message`,
    is_read: false,
  });

  if (error) {
    console.error("notifyNewMessage failed:", error.message, error);
  }
}

/** One entry per person the current user has exchanged messages with, most recent first. */
export async function getConversations(): Promise<{ data: ConversationSummary[]; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { data: [] };

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("sent_at", { ascending: false });

    if (error) {
      console.error("getConversations failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!messages || messages.length === 0) return { data: [] };

    // Messages are sorted newest first, so the first message seen per partner is their latest.
    const latestByPartner = new Map<string, Message>();
    for (const message of messages as Message[]) {
      const partnerId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
      if (!latestByPartner.has(partnerId)) {
        latestByPartner.set(partnerId, message);
      }
    }

    const partnerIds = [...latestByPartner.keys()];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", partnerIds);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    return {
      data: partnerIds.map((partnerId) => {
        const message = latestByPartner.get(partnerId) as Message;
        const lastMessage = message.shared_video_id
          ? "🎥 Video"
          : message.shared_event_id
            ? "📅 Event"
            : message.text;
        return {
          otherUserId: partnerId,
          otherUser: profileById.get(partnerId) ?? null,
          lastMessage,
          lastMessageAt: message.sent_at,
          isMine: message.sender_id === user.id,
        };
      }),
    };
  } catch (err) {
    console.error("getConversations failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** All messages exchanged with another user, oldest first, with any shared video/event resolved to a preview. */
export async function getConversation(otherUserId: string): Promise<{ data: ConversationMessage[]; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { data: [] };

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order("sent_at", { ascending: true });

    if (error) {
      console.error("getConversation failed:", error.message, error);
      return { data: [], error: error.message };
    }

    const messages = (data as Message[]) ?? [];
    const videoIds = [...new Set(messages.map((m) => m.shared_video_id).filter((id): id is string => !!id))];
    const eventIds = [...new Set(messages.map((m) => m.shared_event_id).filter((id): id is string => !!id))];

    const [{ data: videos }, { data: events }] = await Promise.all([
      videoIds.length > 0
        ? supabase.from("videos").select("id, video_url, thumbnail_url, description").in("id", videoIds)
        : Promise.resolve({ data: [] as SharedVideoPreview[] }),
      eventIds.length > 0
        ? supabase.from("events").select("id, title, cover_image_url").in("id", eventIds)
        : Promise.resolve({ data: [] as SharedEventPreview[] }),
    ]);
    const videoById = new Map((videos ?? []).map((v) => [v.id, v]));
    const eventById = new Map((events ?? []).map((e) => [e.id, e]));

    return {
      data: messages.map((message) => ({
        ...message,
        sharedVideo: message.shared_video_id ? (videoById.get(message.shared_video_id) ?? null) : null,
        sharedEvent: message.shared_event_id ? (eventById.get(message.shared_event_id) ?? null) : null,
      })),
    };
  } catch (err) {
    console.error("getConversation failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** A single message by id - used to resolve who a "new_message" notification is from. */
export async function getMessageById(id: string): Promise<Message | null> {
  const { data } = await supabase.from("messages").select("*").eq("id", id).maybeSingle();
  return (data as Message) ?? null;
}

/** Marks all unread messages from the other user in this conversation as read. */
export async function markMessagesAsRead(otherUserId: string): Promise<{ error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return {};

    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("markMessagesAsRead failed:", error.message, error);
      return { error: error.message };
    }

    return {};
  } catch (err) {
    console.error("markMessagesAsRead failed:", err);
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Sends a direct message to another user and creates a "new_message" notification for them. */
export async function sendMessage(receiverId: string, text: string): Promise<{ data?: Message; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { error: "Not authenticated" };

    const trimmed = text.trim();
    if (!trimmed) return { error: "Message can't be empty" };

    const { data: insertedMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        text: trimmed,
      })
      .select("*")
      .single();

    if (messageError) {
      console.error("sendMessage failed:", messageError.message, messageError);
      return { error: messageError.message };
    }

    if (insertedMessage) {
      notifyNewMessage(receiverId, insertedMessage.id, user.id);
    }

    return { data: insertedMessage as Message };
  } catch (err) {
    console.error("sendMessage failed:", err);
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Sends a video to another user as a chat message and creates a "new_message" notification for them. */
export async function shareVideoToUser(receiverId: string, videoId: string): Promise<{ error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { error: "Not authenticated" };

    const { data: insertedMessage, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: receiverId, text: "Shared a video", shared_video_id: videoId })
      .select("id")
      .single();

    if (error) {
      console.error("shareVideoToUser failed:", error.message, error);
      return { error: error.message };
    }

    if (insertedMessage) {
      notifyNewMessage(receiverId, insertedMessage.id, user.id);
    }

    return {};
  } catch (err) {
    console.error("shareVideoToUser failed:", err);
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Sends an event to another user as a chat message and creates a "new_message" notification for them. */
export async function shareEventToUser(receiverId: string, eventId: string): Promise<{ error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { error: "Not authenticated" };

    const { data: insertedMessage, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: receiverId, text: "Shared an event", shared_event_id: eventId })
      .select("id")
      .single();

    if (error) {
      console.error("shareEventToUser failed:", error.message, error);
      return { error: error.message };
    }

    if (insertedMessage) {
      notifyNewMessage(receiverId, insertedMessage.id, user.id);
    }

    return {};
  } catch (err) {
    console.error("shareEventToUser failed:", err);
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}
