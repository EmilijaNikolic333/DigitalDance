// lib/supabase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Creates a fresh Realtime channel for `name`, first removing any stale channel already
 * registered under that same topic. Without this, a fast unmount/remount (React re-running
 * an effect before the previous channel's async removeChannel() has actually finished) can
 * hand back the old, already-subscribed channel instance instead of a new one - calling
 * `.on(...)` on it then throws "cannot add postgres_changes callbacks ... after subscribe()". */
export function createChannel(name: string) {
  const topic = `realtime:${name}`;
  const stale = supabase.getChannels().find((c) => c.topic === topic);
  if (stale) supabase.removeChannel(stale);
  return supabase.channel(name);
}