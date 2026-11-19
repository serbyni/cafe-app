import { BrandMark } from "@/components/ui/brand-mark";

/** Platform root placeholder. Café pages (<slug>.<root>) and QR short links come next. */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-md px-gutter py-xl text-center">
      <BrandMark className="h-16 w-16" priority />
      <h1 className="text-display-lg text-primary">Serbi</h1>
      <p className="text-on-surface-variant">QR menus and ordering for cafés.</p>
    </main>
  );
}
