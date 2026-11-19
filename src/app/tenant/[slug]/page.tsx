import { Suspense } from "react";
import { BrandMark } from "@/components/ui/brand-mark";

/** Café home page — placeholder until the public café data is loaded (next step). */
async function CafeHome({ params }: { params: PageProps<"/tenant/[slug]">["params"] }) {
  const { slug } = await params;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-sm px-gutter py-xl text-center">
      <p className="text-caption font-semibold tracking-wide text-on-surface-variant uppercase">
        Café
      </p>
      <h1 className="text-display-lg text-primary">{slug}</h1>
      <p className="text-on-surface-variant">Menu coming soon.</p>
      <p className="mt-lg flex items-center gap-xs text-caption text-outline">
        <BrandMark className="h-5 w-5" /> Powered by Serbi
      </p>
    </main>
  );
}

export default function CafePage({ params }: PageProps<"/tenant/[slug]">) {
  return (
    <Suspense fallback={null}>
      <CafeHome params={params} />
    </Suspense>
  );
}
