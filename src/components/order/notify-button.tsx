"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { saveOrderPushAction } from "@/app/tenant/[slug]/actions";
import { Icon } from "@/components/ui/icon";
import type { CafePalette } from "@/lib/cafes/theme";
import { pushState, subscribePush, type PushState } from "@/lib/push-client";

/** "Get notified on this phone": push for every update of this order. */
export function NotifyButton({
  slug,
  token,
  vapidKey,
  c,
}: {
  slug: string;
  token: string;
  vapidKey: string;
  c: CafePalette;
}) {
  const t = useTranslations("order.notify");
  const [state, setState] = useState<PushState | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    let alive = true;
    void pushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);
  if (state === null || state === "unsupported") return null;
  if (state !== "off")
    return (
      <p className="flex items-center gap-xs text-body-sm text-on-surface-variant">
        <Icon name={state === "on" ? "notifications_active" : "info"} className="text-icon-md" />
        {state === "on" ? t("on") : state === "blocked" ? t("blocked") : t("install")}
      </p>
    );
  return (
    <div className="flex flex-col gap-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setFailed(false);
            try {
              const keys = await subscribePush(vapidKey);
              if (!keys) {
                setState(Notification.permission === "denied" ? "blocked" : "off");
                return;
              }
              if (await saveOrderPushAction(slug, token, keys)) setState("on");
              else setFailed(true);
            } catch {
              setFailed(true);
            }
          })
        }
        className="flex h-11 items-center justify-center gap-xs rounded-full font-semibold disabled:opacity-60"
        style={{ backgroundColor: c.container, color: c.onContainer }}
      >
        <Icon
          name={pending ? "progress_activity" : "notifications"}
          className={`text-icon-lg ${pending ? "animate-spin" : ""}`}
        />
        {t("button")}
      </button>
      {failed ? (
        <p role="alert" className="text-body-xs text-error">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
}
