import type { Message, Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export interface ConversationSummary {
  otherUserId: string;
  otherUser: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  lastMessage: string;
  lastMessageAt: string;
  isMine: boolean;
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
        return {
          otherUserId: partnerId,
          otherUser: profileById.get(partnerId) ?? null,
          lastMessage: message.text,
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

/** All messages exchanged with another user, oldest first. */
export async function getConversation(otherUserId: string): Promise<{ data: Message[]; error?: string }> {
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

    return { data: (data as Message[]) ?? [] };
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

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: receiverId,
      type: "new_message",
      reference_id: insertedMessage?.id ?? null,
      message: `${senderProfile?.full_name || "Someone"} sent you a message`,
      is_read: false,
    });

    if (notificationError) {
      // The message itself was sent successfully - a failed notification isn't worth failing the whole action for.
      console.error("sendMessage (notification) failed:", notificationError.message, notificationError);
    }

    return { data: insertedMessage as Message };
  } catch (err) {
    console.error("sendMessage failed:", err);
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}
