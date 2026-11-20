/*
 * Customer cart (browser only, per café). Prices here are for display; place_order recomputes
 * every price on the server.
 */

export type CartLine = {
  /** Same item + same choices + same note → one line. */
  key: string;
  itemId: string;
  name: string;
  /** Chosen option ids, and their names for display. */
  choices: string[];
  choiceNames: string[];
  unitPrice: number;
  quantity: number;
  note: string;
};
export type Cart = { lines: CartLine[] };

export const CART_LIMITS = { lines: 30, quantity: 20 } as const;
export const emptyCart: Cart = { lines: [] };

export const lineKey = (itemId: string, choices: string[], note: string) =>
  [itemId, [...choices].sort().join("+"), note.trim()].join("|");

export function addLine(cart: Cart, line: Omit<CartLine, "key">): Cart {
  const key = lineKey(line.itemId, line.choices, line.note);
  const found = cart.lines.find((l) => l.key === key);
  if (found)
    return setQuantity(cart, key, Math.min(CART_LIMITS.quantity, found.quantity + line.quantity));
  if (cart.lines.length >= CART_LIMITS.lines) return cart;
  const quantity = Math.max(1, Math.min(CART_LIMITS.quantity, Math.floor(line.quantity)));
  return { lines: [...cart.lines, { ...line, quantity, note: line.note.trim(), key }] };
}

/** Quantity 0 removes the line. */
export function setQuantity(cart: Cart, key: string, quantity: number): Cart {
  const q = Math.max(0, Math.min(CART_LIMITS.quantity, Math.floor(quantity)));
  return {
    lines: q
      ? cart.lines.map((l) => (l.key === key ? { ...l, quantity: q } : l))
      : cart.lines.filter((l) => l.key !== key),
  };
}

export const cartCount = (cart: Cart) => cart.lines.reduce((n, l) => n + l.quantity, 0);
export const cartTotal = (cart: Cart) =>
  Math.round(cart.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0) * 1000) / 1000;

/* ── Browser storage (may be unavailable: private mode, blocked site data) ── */

const cartKey = (slug: string) => `serbi_cart:${slug}`;
const ordersKey = (slug: string) => `serbi_orders:${slug}`;

export function loadCart(slug: string): Cart {
  try {
    const raw = JSON.parse(localStorage.getItem(cartKey(slug)) ?? "null") as Cart | null;
    return raw && Array.isArray(raw.lines)
      ? { lines: raw.lines.slice(0, CART_LIMITS.lines) }
      : emptyCart;
  } catch {
    return emptyCart;
  }
}

export function saveCart(slug: string, cart: Cart): void {
  try {
    localStorage.setItem(cartKey(slug), JSON.stringify(cart));
  } catch {
    /* storage unavailable */
  }
}

export type SavedOrder = { token: string; number: number; at: number };
const ORDER_TTL = 12 * 60 * 60 * 1000;

/** Orders placed from this phone in the last 12 hours (newest first). */
export function loadOrders(slug: string): SavedOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(ordersKey(slug)) ?? "[]") as SavedOrder[];
    return Array.isArray(list) ? list.filter((o) => Date.now() - o.at < ORDER_TTL) : [];
  } catch {
    return [];
  }
}

export function rememberOrder(slug: string, o: Omit<SavedOrder, "at">): void {
  try {
    const list = [{ ...o, at: Date.now() }, ...loadOrders(slug).filter((x) => x.token !== o.token)];
    localStorage.setItem(ordersKey(slug), JSON.stringify(list.slice(0, 5)));
  } catch {
    /* storage unavailable */
  }
}

export function forgetOrder(slug: string, token: string): void {
  try {
    localStorage.setItem(
      ordersKey(slug),
      JSON.stringify(loadOrders(slug).filter((o) => o.token !== token)),
    );
  } catch {
    /* storage unavailable */
  }
}
