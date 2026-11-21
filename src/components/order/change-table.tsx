"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveOrderAction } from "@/app/tenant/[slug]/actions";
import { Icon } from "@/components/ui/icon";
import type { CafePalette } from "@/lib/cafes/theme";
import { isSpot, locate } from "@/lib/location/location";
import { spotText } from "./spot-text";
import { TablePicker } from "./table-picker";

/** Order page, table order still open: move it to a free table (phone must be at the café). */
export function ChangeTable({
  slug,
  token,
  tableLabel,
  c,
}: {
  slug: string;
  token: string;
  tableLabel: string | null;
  c: CafePalette;
}) {
  const t = useTranslations("order");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="flex w-fit items-center gap-xs rounded-full border border-surface-container-high px-md py-xs text-body-sm font-semibold"
        style={{ color: c.primary }}
      >
        <Icon name="swap_horiz" className="text-icon-md" />
        {t("changeTableAfter")}
      </button>
      {done ? (
        <p role="status" className="text-body-sm font-semibold text-on-surface">
          {t("movedTo", { label: done })}
        </p>
      ) : null}
      <TablePicker
        slug={slug}
        open={open}
        currentLabel={tableLabel}
        c={c}
        busy={pending}
        busyText={locating ? t("locating") : undefined}
        error={error}
        reloadKey={reloadKey}
        onClose={() => setOpen(false)}
        onPick={(tb) =>
          start(async () => {
            setError(null);
            setLocating(true);
            const s = await locate();
            setLocating(false);
            if (!isSpot(s)) {
              setError(spotText(t, s));
              return;
            }
            const r = await moveOrderAction(slug, token, tb.id, s);
            if (r.ok) {
              setDone(r.label);
              setOpen(false);
              router.refresh();
              return;
            }
            if (r.error === "location" || r.error === "tooFar") setError(spotText(t, r));
            else if (r.error === "taken") {
              setError(t("errors.tableTaken"));
              setReloadKey((k) => k + 1);
            } else if (r.error === "closed") setError(t("errors.moveClosed"));
            else setError(t("errors.generic"));
          })
        }
      />
    </>
  );
}
