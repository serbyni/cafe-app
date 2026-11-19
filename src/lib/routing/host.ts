/**
 * Which site a request is for, from its Host header — the core of multi-tenancy: ONE
 * deployment serves every café, picked from the subdomain (<slug>.<root>).
 *
 *   root      serbi.me, www.serbi.me                    → platform pages (QR short links …)
 *   cafe      <slug>.serbi.me                           → that café's pages
 *   invalid   a.b.serbi.me, bad-.serbi.me, :wrong port  → 404
 *   other     any other host (Vercel previews, IPs)     → root, or a preview café (?cafe=)
 *
 * The root domain comes from NEXT_PUBLIC_ROOT_DOMAIN ("serbi.me", "dev.serbi.me",
 * "localhost:3000"), so no domain is hard-coded. Whether the café exists is checked later,
 * against the database.
 */

export type HostKind =
  { kind: "root" } | { kind: "cafe"; slug: string } | { kind: "invalid" } | { kind: "other" };

/** Café address rules — same as the database check on public.cafes.slug. */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export function isCafeSlug(value: string): boolean {
  return SLUG_PATTERN.test(value) && !value.includes("--");
}

function splitPort(host: string): { name: string; port: string | null } {
  const m = /^(.*?)(?::(\d{1,5}))?$/.exec(host);
  return { name: m?.[1] ?? host, port: m?.[2] ?? null };
}

export function parseHost(rawHost: string | null | undefined, rootDomain: string): HostKind {
  const host = (rawHost ?? "").trim().toLowerCase().replace(/\.$/, "");
  const root = rootDomain.trim().toLowerCase().replace(/\.$/, "");
  if (!host || !root) return { kind: "other" };

  const h = splitPort(host);
  const r = splitPort(root);
  // A root with a port (local dev) only matches requests on that port.
  if (r.port && h.port !== r.port) return { kind: "other" };

  if (h.name === r.name || h.name === `www.${r.name}`) return { kind: "root" };
  if (!h.name.endsWith(`.${r.name}`)) return { kind: "other" };

  const label = h.name.slice(0, -(r.name.length + 1));
  if (label.includes(".")) return { kind: "invalid" }; // nested: a.b.serbi.me
  return isCafeSlug(label) ? { kind: "cafe", slug: label } : { kind: "invalid" };
}
