import type { useTranslations } from "next-intl";
import type { SpotFailure } from "@/app/tenant/[slug]/actions";
import type { SpotError } from "@/lib/location/location";

type T = ReturnType<typeof useTranslations<"order">>;

/** Message for a location problem: from the browser (SpotError) or from the database (SpotFailure). */
export function spotText(t: T, e: SpotError | SpotFailure): string {
  if (typeof e === "string")
    return e === "timeout" || e === "unavailable"
      ? t("errors.locationTimeout")
      : t("errors.location");
  return e.error === "tooFar"
    ? t("errors.tooFar", { distance: e.distance, radius: e.radius })
    : t("errors.location");
}
