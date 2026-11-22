"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";
import { Icon } from "@/components/ui/icon";
import {
  contentsEntryAt,
  paginate,
  PAGE_H,
  PAGE_W,
  type BookInput,
  type PageSpec,
} from "@/lib/book/paginate";
import { hintSeen, markHintSeen } from "@/lib/book/hint";
import type { CafePalette } from "@/lib/cafes/theme";
import { BookHint } from "./book-hint";
import { BookScene, type BookState } from "./book-scene";
import { canvasMeasure, drawPage } from "./draw-page";

export type BookLabels = {
  continued: string;
  cover: string;
  backCover: string;
  pages: string;
  prev: string;
  next: string;
  contents: string;
  zoomIn: string;
  zoomOut: string;
  fullscreen: string;
  exitFullscreen: string;
  listView: string;
  bookLabel: string;
  noWebgl: string;
  gotIt: string;
  hintTap: string;
  hintSwipe: string;
  hintZoom: string;
};

/**
 * The menu as a 3D book (three.js): closed on its cover, tap to open, swipe / drag / arrows to
 * turn, contents lines jump to a category, pinch / double-tap / wheel to zoom, fullscreen. The
 * gesture hint shows once per device. Pages are drawn on canvases (café colours, site font).
 */
export default function MenuBook({
  input,
  c,
  rtl,
  labels,
  listHref,
}: {
  input: BookInput;
  c: CafePalette;
  rtl: boolean;
  labels: BookLabels;
  listHref: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<BookScene | null>(null);
  const [state, setState] = useState<BookState | null>(null);
  const [failed, setFailed] = useState(false);
  const [full, setFull] = useState<"none" | "native" | "overlay">("none");
  const [hint, setHint] = useState(false);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Build pages, textures and the scene once (and again if the menu or language changes).
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let cancelled = false;
    let book: BookScene | null = null;
    const textures = new Map<number, THREE.CanvasTexture>();
    const images = new Map<string, HTMLImageElement>();

    (async () => {
      const family = getComputedStyle(document.body).fontFamily || "sans-serif";
      await Promise.all([
        document.fonts.ready,
        document.fonts
          .load('48px "Material Symbols Outlined"', "restaurant_menu")
          .catch(() => null),
      ]);
      if (cancelled) return;
      const pages: PageSpec[] = paginate(input, canvasMeasure(family));
      const draw = (p: number, tex: THREE.CanvasTexture) => {
        const ctx = (tex.image as HTMLCanvasElement).getContext("2d")!;
        drawPage(ctx, pages[p], {
          palette: c,
          fontFamily: family,
          rtl,
          images,
          labels: { continued: labels.continued },
        });
        tex.needsUpdate = true;
      };
      const photosOf = (p: number) =>
        pages[p]?.kind === "category"
          ? pages[p].blocks.map((b) => b.item.image).filter((x): x is string => !!x)
          : [];
      try {
        book = new BookScene(el, {
          pageCount: pages.length,
          rtl,
          reducedMotion,
          paperColor: c.surface,
          texture: (p) => {
            if (!pages[p]) return null;
            let tex = textures.get(p);
            if (!tex) {
              const canvas = document.createElement("canvas");
              canvas.width = PAGE_W;
              canvas.height = PAGE_H;
              tex = new THREE.CanvasTexture(canvas);
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.anisotropy = 4;
              textures.set(p, tex);
            }
            draw(p, tex);
            // Photos: load, then redraw this page.
            for (const url of photosOf(p)) {
              if (images.has(url)) continue;
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.decoding = "async";
              img.onload = () => {
                for (const [q, t] of textures) if (photosOf(q).includes(url)) draw(q, t);
                book?.refresh();
              };
              img.src = url;
              images.set(url, img);
            }
            return tex;
          },
          release: (p) => {
            textures.get(p)?.dispose();
            textures.delete(p);
          },
          onPageTap: (p, _x, y) => {
            const target = contentsEntryAt(pages[p], y);
            if (target === null) return false;
            book?.goToPage(target);
            return true;
          },
          onChange: (s) => setState(s),
        });
      } catch {
        setFailed(true);
        return;
      }
      if (cancelled) {
        book.dispose();
        return;
      }
      scene.current = book;
      if (!hintSeen()) setHint(true);
    })();

    return () => {
      cancelled = true;
      book?.dispose();
      for (const t of textures.values()) t.dispose();
      scene.current = null;
    };
  }, [input, c, rtl, labels.continued, reducedMotion]);

  // Native fullscreen exits with Esc / the system gesture.
  useEffect(() => {
    const on = () => {
      if (!document.fullscreenElement && full === "native") setFull("none");
    };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, [full]);

  const toggleFull = async () => {
    const el = frame.current;
    if (!el) return;
    if (full === "native") return void (await document.exitFullscreen().catch(() => null));
    if (full === "overlay") return setFull("none");
    if (document.fullscreenEnabled && el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        setFull("native");
        return;
      } catch {
        /* iPhone Safari: no element fullscreen → overlay */
      }
    }
    setFull("overlay");
  };

  const closeHint = () => {
    setHint(false);
    markHintSeen();
  };

  const onKey = (e: KeyboardEvent) => {
    const b = scene.current;
    if (!b) return;
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === fwd) b.next();
    else if (e.key === back) b.prev();
    else if (e.key === "+" || e.key === "=") b.zoomBy(1.25);
    else if (e.key === "-") b.zoomBy(0.8);
    else if (e.key === "Escape" && full === "overlay") setFull("none");
    else return;
    e.preventDefault();
  };

  if (failed)
    return (
      <p className="flex flex-col items-center gap-sm rounded-2xl bg-surface-container p-lg text-center text-body-sm">
        {labels.noWebgl}
        <Link href={listHref} className="font-semibold underline" style={{ color: c.primary }}>
          {labels.listView}
        </Link>
      </p>
    );

  const k = state?.k ?? 0;
  const sheets = state?.sheets ?? 0;
  const where =
    k === 0
      ? labels.cover
      : k === sheets
        ? labels.backCover
        : `${labels.pages} ${2 * k - 1}–${2 * k}`;
  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm disabled:opacity-40";

  return (
    <div
      ref={frame}
      tabIndex={0}
      onKeyDown={onKey}
      role="region"
      aria-roledescription="book"
      aria-label={labels.bookLabel}
      className={`relative flex flex-col gap-sm outline-none ${
        full === "overlay"
          ? "fixed inset-0 z-50 bg-background p-sm"
          : full === "native"
            ? "bg-background p-sm"
            : ""
      }`}
    >
      <div
        ref={stage}
        className={`relative w-full overflow-hidden rounded-2xl ${
          full === "none" ? "aspect-square sm:aspect-video" : "flex-1"
        }`}
        style={{ backgroundColor: c.container }}
      >
        {hint ? (
          <BookHint
            c={c}
            reducedMotion={reducedMotion}
            gotIt={labels.gotIt}
            onDone={closeHint}
            steps={[
              { icon: "touch_app", text: labels.hintTap, motion: "tap" },
              { icon: "swipe", text: labels.hintSwipe, motion: "swipe" },
              { icon: "pinch_zoom_out", text: labels.hintZoom, motion: "pinch" },
            ]}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-sm" dir={rtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            className={btn}
            aria-label={labels.prev}
            disabled={k === 0 || state?.zoomed}
            onClick={() => scene.current?.prev()}
          >
            <Icon name="chevron_left" className="text-icon-xl" flipRtl />
          </button>
          <span
            className="min-w-24 text-center text-body-sm font-semibold tabular-nums"
            aria-live="polite"
          >
            {where}
          </span>
          <button
            type="button"
            className={btn}
            aria-label={labels.next}
            disabled={k === sheets || state?.zoomed}
            onClick={() => scene.current?.next()}
          >
            <Icon name="chevron_right" className="text-icon-xl" flipRtl />
          </button>
        </div>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            className={btn}
            aria-label={labels.contents}
            onClick={() => scene.current?.goToPage(1)}
          >
            <Icon name="toc" className="text-icon-lg" />
          </button>
          <button
            type="button"
            className={btn}
            aria-label={labels.zoomOut}
            onClick={() => scene.current?.zoomBy(0.8)}
          >
            <Icon name="zoom_out" className="text-icon-lg" />
          </button>
          <button
            type="button"
            className={btn}
            aria-label={labels.zoomIn}
            onClick={() => scene.current?.zoomBy(1.25)}
          >
            <Icon name="zoom_in" className="text-icon-lg" />
          </button>
          <button
            type="button"
            className={btn}
            aria-label={full === "none" ? labels.fullscreen : labels.exitFullscreen}
            aria-pressed={full !== "none"}
            onClick={toggleFull}
          >
            <Icon
              name={full === "none" ? "fullscreen" : "fullscreen_exit"}
              className="text-icon-lg"
            />
          </button>
          {full === "none" ? (
            <Link
              href={listHref}
              className="flex h-10 items-center gap-xs rounded-full bg-surface-container-lowest px-md text-body-sm font-semibold shadow-sm"
              style={{ color: c.primary }}
            >
              <Icon name="view_list" className="text-icon-lg" />
              {labels.listView}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
