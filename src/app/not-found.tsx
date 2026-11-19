import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-sm px-gutter py-xl text-center">
      <Icon name="search_off" className="text-icon-2xl text-outline" />
      <h1 className="text-headline-md text-primary">Page not found</h1>
      <p className="text-on-surface-variant">This page does not exist.</p>
    </main>
  );
}
