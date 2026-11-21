import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Browser only: calls `onChange` whenever the order behind `token` changes (public Supabase
 * Realtime channel 'order:<token>', publishable key — the token is the secret). Returns the
 * unsubscribe function.
 */
export function subscribeToOrder(token: string, onChange: () => void): () => void {
  const env = publicEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    // No session here; own storage key so it never meets another Supabase client's auth state.
    auth: { persistSession: false, autoRefreshToken: false, storageKey: "serbi-order-updates" },
  });
  const channel = db
    .channel(`order:${token}`)
    .on("broadcast", { event: "order" }, onChange)
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}
