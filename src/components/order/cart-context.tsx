"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addLine,
  emptyCart,
  loadCart,
  saveCart,
  setQuantity,
  type Cart,
  type CartLine,
} from "@/lib/cart/cart";

type CartApi = {
  cart: Cart;
  add: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

/** Cart of one café, kept in this browser (loaded after the first render: no hydration mismatch). */
export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const loaded = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setCart(loadCart(slug));
      loaded.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, [slug]);
  useEffect(() => {
    if (loaded.current) saveCart(slug, cart);
  }, [slug, cart]);
  const api = useMemo<CartApi>(
    () => ({
      cart,
      add: (line) => setCart((c) => addLine(c, line)),
      setQty: (key, q) => setCart((c) => setQuantity(c, key, q)),
      clear: () => setCart(emptyCart),
    }),
    [cart],
  );
  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

/** The café's cart (null outside a CartProvider: ordering not available on this page). */
export function useCart(): CartApi | null {
  return useContext(CartContext);
}
