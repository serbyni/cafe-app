import type { CafePalette } from "@/lib/cafes/theme";
import {
  FONTS,
  LINE,
  MARGIN,
  PAGE_H,
  PAGE_W,
  PHOTO,
  type FontKey,
  type PageSpec,
} from "@/lib/book/paginate";

/*
 * Draws one book page on a 2D canvas (it becomes a three.js texture). Café colours, the site's
 * font, Material Symbols for icons, right-to-left text for Arabic. Photos come from `images`
 * (loaded by the caller); a missing photo leaves its frame empty until it arrives.
 */

export type DrawOptions = {
  palette: CafePalette;
  fontFamily: string;
  rtl: boolean;
  images: Map<string, HTMLImageElement>;
  labels: { continued: string };
};

const ICON_FONT = '"Material Symbols Outlined"';

export function font(key: FontKey, family: string) {
  return `${FONTS[key]} ${family}`;
}

/** A canvas-based measure for the paginator (same fonts as the drawing). */
export function canvasMeasure(family: string) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  return (text: string, key: FontKey) => {
    ctx.font = font(key, family);
    return ctx.measureText(text).width;
  };
}

function paper(ctx: CanvasRenderingContext2D, p: CafePalette) {
  ctx.fillStyle = p.surface;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  // A thin frame in the café colour.
  ctx.strokeStyle = p.variant;
  ctx.lineWidth = 3;
  ctx.strokeRect(MARGIN / 2, MARGIN / 2, PAGE_W - MARGIN, PAGE_H - MARGIN);
}

function icon(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.font = `${size}px ${ICON_FONT}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(name, x, y);
  ctx.restore();
}

/** x of a line start (left in LTR, right in RTL), with `align` set accordingly. */
function start(ctx: CanvasRenderingContext2D, rtl: boolean, inset = 0) {
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  return rtl ? PAGE_W - MARGIN - inset : MARGIN + inset;
}
function end(ctx: CanvasRenderingContext2D, rtl: boolean) {
  ctx.textAlign = rtl ? "left" : "right";
  return rtl ? MARGIN : PAGE_W - MARGIN;
}

function roundedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  x: number,
  y: number,
  size: number,
  p: CafePalette,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 20);
  ctx.clip();
  ctx.fillStyle = p.variant;
  ctx.fillRect(x, y, size, size);
  if (img?.complete && img.naturalWidth) {
    // Cover-fit.
    const s = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  }
  ctx.restore();
}

export function drawPage(ctx: CanvasRenderingContext2D, page: PageSpec, o: DrawOptions) {
  const { palette: p, fontFamily: ff, rtl } = o;
  ctx.save();
  ctx.clearRect(0, 0, PAGE_W, PAGE_H);
  ctx.textBaseline = "alphabetic";

  if (page.kind === "cover") {
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.strokeStyle = p.onPrimary;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4;
    ctx.strokeRect(MARGIN / 2, MARGIN / 2, PAGE_W - MARGIN, PAGE_H - MARGIN);
    ctx.globalAlpha = 1;
    icon(ctx, "restaurant_menu", PAGE_W / 2 - 60, PAGE_H * 0.32, 120, p.onPrimary);
    ctx.fillStyle = p.onPrimary;
    ctx.textAlign = "center";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.font = font("coverTitle", ff);
    ctx.fillText(page.title, PAGE_W / 2, PAGE_H * 0.5, PAGE_W - 2 * MARGIN);
    ctx.fillRect(PAGE_W / 2 - 80, PAGE_H * 0.5 + 50, 160, 4);
    ctx.font = font("coverSub", ff);
    ctx.fillText(page.subtitle, PAGE_W / 2, PAGE_H * 0.5 + 130);
    ctx.restore();
    return;
  }

  paper(ctx, p);
  if (page.kind === "blank") {
    ctx.restore();
    return;
  }

  if (page.kind === "contents" || page.kind === "back") {
    ctx.fillStyle = p.primary;
    ctx.font = font("pageTitle", ff);
    ctx.fillText(page.title, start(ctx, rtl), MARGIN + 70);
  }

  if (page.kind === "contents") {
    for (const e of page.entries) {
      const iconInset = e.icon ? 56 : 0;
      if (e.icon) icon(ctx, e.icon, rtl ? PAGE_W - MARGIN - 44 : MARGIN, e.y - 14, 40, p.primary);
      ctx.fillStyle = p.onSurface;
      ctx.font = font("contentsLine", ff);
      ctx.fillText(e.name, start(ctx, rtl, iconInset), e.y, PAGE_W - 2 * MARGIN - 120 - iconInset);
      ctx.fillStyle = p.primary;
      ctx.fillText(String(e.page), end(ctx, rtl), e.y);
      // Dotted leader.
      ctx.fillStyle = p.variant;
      ctx.fillRect(MARGIN, e.y + 14, PAGE_W - 2 * MARGIN, 2);
    }
  }

  if (page.kind === "back") {
    let y = MARGIN + 150;
    ctx.font = font("contentsLine", ff);
    for (const h of page.hours) {
      ctx.fillStyle = p.onSurface;
      ctx.fillText(h.days, start(ctx, rtl), y);
      ctx.fillStyle = p.primary;
      ctx.fillText(h.hours, end(ctx, rtl), y);
      y += LINE.contents;
    }
    y += 40;
    ctx.fillStyle = p.onVariant;
    ctx.font = font("small", ff);
    for (const l of page.lines) {
      ctx.fillText(l, start(ctx, rtl), y, PAGE_W - 2 * MARGIN);
      y += 40;
    }
  }

  if (page.kind === "category") {
    // Title (smaller on continued pages).
    const titleY = MARGIN + (page.continued ? 50 : 70);
    if (page.icon)
      icon(
        ctx,
        page.icon,
        rtl ? PAGE_W - MARGIN - 56 : MARGIN,
        titleY - 18,
        page.continued ? 40 : 56,
        p.primary,
      );
    ctx.fillStyle = p.primary;
    ctx.font = page.continued ? font("contentsLine", ff) : font("pageTitle", ff);
    const title = page.continued ? `${page.title} ${o.labels.continued}` : page.title;
    ctx.fillText(title, start(ctx, rtl, page.icon ? (page.continued ? 52 : 72) : 0), titleY);
    ctx.fillRect(MARGIN, titleY + 24, 120, 4);

    for (const b of page.blocks) {
      const hasPhoto = !!b.item.image;
      if (hasPhoto) {
        const px = rtl ? PAGE_W - MARGIN - PHOTO : MARGIN;
        roundedImage(ctx, o.images.get(b.item.image!), px, b.y, PHOTO, p);
      }
      const inset = hasPhoto ? PHOTO + 28 : 0;
      let y = b.y + 36;
      ctx.font = font("itemPrice", ff);
      ctx.fillStyle = p.primary;
      ctx.fillText(b.item.price, end(ctx, rtl), y);
      ctx.fillStyle = p.onSurface;
      ctx.font = font("itemName", ff);
      for (const l of b.nameLines) {
        ctx.fillText(l, start(ctx, rtl, inset), y);
        y += LINE.itemName;
      }
      ctx.fillStyle = p.onVariant;
      ctx.font = font("itemDesc", ff);
      for (const l of b.descLines) {
        ctx.fillText(l, start(ctx, rtl, inset), y);
        y += LINE.itemDesc;
      }
      if (b.item.tags.length) {
        ctx.font = font("itemTags", ff);
        let x = rtl ? PAGE_W - MARGIN - inset : MARGIN + inset;
        for (const tg of b.item.tags) {
          const w = ctx.measureText(tg.name).width + 40;
          const bx = rtl ? x - w : x;
          ctx.fillStyle = p.container;
          ctx.beginPath();
          ctx.roundRect(bx, y - 4, w, 32, 16);
          ctx.fill();
          icon(ctx, tg.icon, rtl ? bx + w - 30 : bx + 8, y + 12, 22, p.onContainer);
          ctx.fillStyle = p.onContainer;
          ctx.textAlign = rtl ? "right" : "left";
          ctx.fillText(tg.name, rtl ? bx + w - 34 : bx + 34, y + 20);
          x = rtl ? bx - 10 : bx + w + 10;
        }
      }
    }
    // Page number.
    ctx.fillStyle = p.onVariant;
    ctx.font = font("small", ff);
    ctx.textAlign = "center";
    ctx.fillText(String(page.number), PAGE_W / 2, PAGE_H - MARGIN + 10);
  }
  ctx.restore();
}
