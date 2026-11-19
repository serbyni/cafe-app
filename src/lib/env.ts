import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  /**
   * Domain the cafés live under: a request to <slug>.<root> shows that café; <root> itself is
   * the platform root (QR short links). e.g. "serbi.me", "dev.serbi.me", "localhost:3000".
   */
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().regex(/^[a-z0-9.-]+(:\d{2,5})?$/),
  /** Platform app (registration, owner dashboard), e.g. https://serbi.me. */
  NEXT_PUBLIC_PLATFORM_URL: z.url(),
});

export type PublicEnv = z.infer<typeof schema>;

let cached: PublicEnv | undefined;

/**
 * Public environment, validated on first use (not at import time, so builds without
 * secrets — e.g. CI — still succeed). NEXT_PUBLIC_* values are inlined at build time.
 */
export function publicEnv(): PublicEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    NEXT_PUBLIC_PLATFORM_URL: process.env.NEXT_PUBLIC_PLATFORM_URL,
  });
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid environment variables: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}. See .env.example.`,
    );
  }
  cached = parsed.data;
  return cached;
}
