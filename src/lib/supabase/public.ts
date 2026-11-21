import { publicEnv } from "@/lib/env";
import type { DbArgs, DbFunctionName, DbReturns } from "./database.types";

/**
 * Calls a PUBLIC database function (granted to anon) over HTTP with the publishable key only —
 * no session, no client state. Used inside "use cache" functions: a plain fetch keeps every
 * cached call self-contained (supabase-js shares internal state between calls).
 */
export async function rpcPublic<F extends DbFunctionName>(
  fn: F,
  args: DbArgs<F>,
): Promise<{
  data: DbReturns<F> | null;
  error: { code: string; message: string; details?: string } | null;
}> {
  const env = publicEnv();
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store", // caching is done by the "use cache" caller
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      details?: string;
    };
    return {
      data: null,
      error: {
        code: body.code ?? String(res.status),
        message: body.message ?? res.statusText,
        details: body.details ?? undefined,
      },
    };
  }
  // Functions returning void answer 204 / an empty body.
  const text = await res.text();
  return { data: (text ? JSON.parse(text) : null) as DbReturns<F>, error: null };
}
