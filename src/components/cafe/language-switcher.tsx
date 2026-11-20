"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { setLanguageAction } from "@/app/tenant/[slug]/actions";

/** Globe button listing the café's languages (names in their own language). */
export function LanguageSwitcher({
  current,
  options,
  label,
}: {
  current: string;
  options: { code: string; name: string }[];
  label: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDetailsElement>(null);
  const [pending, start] = useTransition();
  if (options.length < 2) return null;
  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={label}
        title={label}
        className="no-marker flex h-10 cursor-pointer list-none items-center gap-xs rounded-full px-sm text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container"
      >
        <Icon
          name={pending ? "progress_activity" : "language"}
          className={`text-icon-lg ${pending ? "animate-spin" : ""}`}
        />
        <span className="uppercase">{current}</span>
      </summary>
      <ul className="absolute end-0 z-50 mt-xs w-44 overflow-hidden rounded-xl border border-surface-container-high bg-surface-container-lowest py-xs shadow-card-warm">
        {options.map((o) => (
          <li key={o.code}>
            <button
              type="button"
              lang={o.code}
              aria-current={o.code === current ? "true" : undefined}
              onClick={() => {
                if (ref.current) ref.current.open = false;
                start(async () => {
                  await setLanguageAction(o.code);
                  router.refresh();
                });
              }}
              className={`flex w-full items-center justify-between px-md py-sm text-start text-body-sm hover:bg-surface-container-low ${
                o.code === current ? "font-bold text-primary" : "text-on-surface"
              }`}
            >
              {o.name}
              {o.code === current ? <Icon name="check" className="text-icon-md" /> : null}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
