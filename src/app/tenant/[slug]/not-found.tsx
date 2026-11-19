import { BrandMark } from "@/components/ui/brand-mark";
import { Icon } from "@/components/ui/icon";
import { publicEnv } from "@/lib/env";

/** Unknown café address (no café with this slug). */
export default function CafeNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-sm px-gutter py-xl text-center">
      <Icon name="storefront" className="text-icon-2xl text-outline" />
      <h1 className="text-headline-md text-primary">This café doesn&apos;t exist</h1>
      <p className="text-on-surface-variant">
        Check the address, or scan the QR code on your table again.
      </p>
      <a
        href={publicEnv().NEXT_PUBLIC_PLATFORM_URL}
        className="mt-lg flex items-center gap-xs text-caption text-outline hover:text-on-surface-variant"
      >
        <BrandMark className="h-5 w-5" /> Serbi — QR menus for cafés
      </a>
    </main>
  );
}
