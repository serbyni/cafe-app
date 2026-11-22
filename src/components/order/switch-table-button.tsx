"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chooseTableAction } from "@/app/tenant/[slug]/actions";
import type { CafePalette } from "@/lib/cafes/theme";
import { TablePicker } from "./table-picker";

/**
 * Menu banner "Not your table?": picks another free table directly (the cart stays as it is).
 * The phone's location is checked when the order is sent.
 */
export function SwitchTableButton({
  slug,
  tableLabel,
  c,
}: {
  slug: string;
  tableLabel: string;
  c: CafePalette;
}) {
  const t = useTranslations("menu");
  const to = useTranslations("order");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        className="shrink-0 text-body-sm underline underline-offset-2"
      >
        {t("notYourTable")}
      </button>
      <TablePicker
        slug={slug}
        open={open}
        currentLabel={tableLabel}
        c={c}
        busy={pending}
        error={error}
        reloadKey={reloadKey}
        onClose={() => setOpen(false)}
        onPick={(tb) =>
          start(async () => {
            setError(null);
            const r = await chooseTableAction(slug, tb.id);
            if (!r.ok) {
              setError(to("errors.tableTaken"));
              setReloadKey((k) => k + 1);
              return;
            }
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
