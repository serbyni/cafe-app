"use client";

import dynamic from "next/dynamic";
import type { BookInput } from "@/lib/book/paginate";
import type { CafePalette } from "@/lib/cafes/theme";
import type { BookLabels } from "./menu-book";

/** three.js is only downloaded on book menus. */
const MenuBook = dynamic(() => import("./menu-book"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface-container sm:aspect-video" />
  ),
});

export function BookView(props: {
  input: BookInput;
  c: CafePalette;
  rtl: boolean;
  labels: BookLabels;
  listHref: string;
}) {
  return <MenuBook {...props} />;
}
