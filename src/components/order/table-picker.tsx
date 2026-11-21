"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { freeTablesAction } from "@/app/tenant/[slug]/actions";
import { Icon } from "@/components/ui/icon";
import type { CafePalette } from "@/lib/cafes/theme";
import { groupTables, type PublicTable } from "@/lib/orders/schema";

/**
 * "Choose your table": the café's free tables right now, grouped by area; the current one is
 * marked. The parent does the change (and shows its error / progress here).
 */
export function TablePicker({
  slug,
  open,
  currentLabel,
  c,
  busy,
  busyText,
  error,
  onPick,
  onClose,
  reloadKey,
}: {
  slug: string;
  open: boolean;
  currentLabel: string | null;
  c: CafePalette;
  busy: boolean;
  /** Shown while the parent works (e.g. "Checking you're at the café…"). */
  busyText?: string;
  error: string | null;
  onPick: (table: PublicTable) => void;
  onClose: () => void;
  /** Changing it reloads the list (e.g. after "table just taken"). */
  reloadKey?: number;
}) {
  const t = useTranslations("order");
  const ref = useRef<HTMLDialogElement>(null);
  const [tables, setTables] = useState<PublicTable[] | null>(null);
  const [loading, start] = useTransition();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const load = () =>
    start(async () => {
      setTables(await freeTablesAction(slug));
    });
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open / reloadKey only
  }, [open, reloadKey]);

  const groups = tables ? groupTables(tables, currentLabel) : [];
  const others = groups.flatMap((g) => g.tables).filter((x) => x.label !== currentLabel);

  return (
    <dialog
      ref={ref}
      aria-labelledby="table-picker-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-card-md overflow-hidden rounded-t-3xl bg-surface-container-lowest p-0 text-on-surface shadow-card-warm backdrop:bg-inverse-surface/50 sm:mb-auto sm:rounded-3xl"
    >
      <div className="flex max-h-screen flex-col gap-md overflow-y-auto p-lg">
        <div className="flex items-start justify-between gap-sm">
          <div>
            <h2 id="table-picker-title" className="text-headline-md">
              {t("tablesTitle")}
            </h2>
            <p className="text-body-sm text-on-surface-variant">{t("tablesHint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-40"
          >
            <Icon name="close" className="text-icon-lg" />
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-error-container p-sm text-body-sm text-on-error-container"
          >
            {error}
          </p>
        ) : null}
        {busy ? (
          <p
            role="status"
            className="flex items-center gap-xs text-body-sm font-semibold"
            style={{ color: c.primary }}
          >
            <Icon name="progress_activity" className="animate-spin text-icon-md" />
            {busyText}
          </p>
        ) : null}

        {tables === null ? (
          <p className="text-body-sm text-on-surface-variant">{t("loadingTables")}</p>
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.area} className="flex flex-col gap-xs">
                <h3 className="text-caption font-semibold text-on-surface-variant uppercase">
                  {g.area}
                </h3>
                <ul className="grid grid-cols-3 gap-xs">
                  {g.tables.map((tb) => {
                    const current = tb.label === currentLabel;
                    return (
                      <li key={tb.id}>
                        <button
                          type="button"
                          disabled={busy || current}
                          aria-current={current ? "true" : undefined}
                          onClick={() => onPick(tb)}
                          className="flex w-full flex-col items-center rounded-xl border border-surface-container-high px-xs py-sm disabled:cursor-default"
                          style={
                            current
                              ? { backgroundColor: c.container, color: c.onContainer }
                              : undefined
                          }
                        >
                          <span className="text-body-lg font-bold" dir="auto">
                            {tb.label}
                          </span>
                          <span className="text-caption opacity-75">
                            {current ? t("yourTable") : t("seats", { count: tb.seats })}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {others.length === 0 ? (
              <p className="rounded-xl bg-surface-container p-md text-center text-body-sm text-on-surface-variant">
                {t("noFreeTables")}
              </p>
            ) : null}
          </>
        )}

        <p className="flex items-start gap-xs text-caption text-on-surface-variant">
          <Icon name="location_on" className="text-icon-sm" />
          {t("locationWhy")}
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading || busy}
          className="flex items-center justify-center gap-xs self-center rounded-full px-md py-xs text-body-sm font-semibold disabled:opacity-50"
          style={{ color: c.primary }}
        >
          <Icon name="refresh" className={`text-icon-md ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>
    </dialog>
  );
}
