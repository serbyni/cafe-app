"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { CafePalette } from "@/lib/cafes/theme";

/**
 * First-visit gesture hint over the book: a hand acting out each step (tap the cover, swipe,
 * zoom). Shown once per device (the parent decides); closes on "Got it" or the first touch.
 */
export function BookHint({
  steps,
  gotIt,
  c,
  reducedMotion,
  onDone,
}: {
  steps: { icon: string; text: string; motion: "tap" | "swipe" | "pinch" }[];
  gotIt: string;
  c: CafePalette;
  reducedMotion: boolean;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setI((x) => (x + 1) % steps.length), 2200);
    return () => clearInterval(id);
  }, [steps.length, reducedMotion]);
  const step = steps[i];
  const motion = reducedMotion
    ? ""
    : step.motion === "swipe"
      ? "animate-book-swipe"
      : step.motion === "pinch"
        ? "animate-book-pinch"
        : "animate-book-tap";
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={steps.map((s) => s.text).join(" · ")}
      className="absolute inset-0 z-10 flex items-center justify-center bg-inverse-surface/40"
      onPointerDown={onDone}
    >
      <div className="mx-gutter flex w-full max-w-card-sm flex-col items-center gap-md rounded-3xl bg-surface-container-lowest p-lg text-center shadow-card-warm">
        <span
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: c.container, color: c.onContainer }}
        >
          <Icon name={step.icon} className={`text-icon-3xl ${motion}`} />
        </span>
        <p className="text-body-lg font-semibold text-on-surface" aria-live="polite">
          {step.text}
        </p>
        <span className="flex gap-xs" aria-hidden="true">
          {steps.map((s, j) => (
            <span
              key={s.text}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: j === i ? c.primary : c.container }}
            />
          ))}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-lg py-sm font-bold"
          style={{ backgroundColor: c.primary, color: c.onPrimary }}
        >
          {gotIt}
        </button>
      </div>
    </div>
  );
}
