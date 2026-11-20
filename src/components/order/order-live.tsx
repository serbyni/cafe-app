"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { forgetOrder } from "@/lib/cart/cart";
import { subscribeToOrder } from "@/lib/data/order-updates";

/** Short "ding" (Web Audio). */
function ding(ctx: AudioContext) {
  const now = ctx.currentTime;
  [988, 1319].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.16);
    g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.16 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.16);
    o.stop(now + i * 0.16 + 0.35);
  });
}

/**
 * Keeps the order page live: refreshes on every change of the order (Realtime), with a 15 s
 * refresh as a safety net. A new status while the page is open → sound + vibration (sound needs
 * one tap on the page first — browser rule). A closed order is forgotten on this phone.
 */
export function OrderLive({
  slug,
  token,
  status,
  closed,
}: {
  slug: string;
  token: string;
  status: string;
  closed: boolean;
}) {
  const router = useRouter();
  const audio = useRef<AudioContext | null>(null);
  const last = useRef(status);

  // Unlock sound on the first tap.
  useEffect(() => {
    const unlock = () => {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Status changed (after a live refresh) → alert.
  useEffect(() => {
    if (last.current === status) return;
    last.current = status;
    if (audio.current) ding(audio.current);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  }, [status]);

  useEffect(() => {
    if (closed) {
      forgetOrder(slug, token);
      return;
    }
    const off = subscribeToOrder(token, () => router.refresh());
    const poll = setInterval(() => router.refresh(), 15_000);
    return () => {
      clearInterval(poll);
      off();
    };
  }, [slug, token, closed, router]);
  return null;
}
