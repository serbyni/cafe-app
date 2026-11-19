import { parsePhoneNumberFromString } from "libphonenumber-js";

/** "+21671123456" → "+216 71 123 456" (international format), or the input. */
export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

/** "https://www.instagram.com/lune" → "@lune"; Facebook → page name. */
export function socialHandle(url: string): string {
  const path = url.replace(/^https:\/\/www\.(facebook|instagram)\.com\//, "");
  return url.includes("instagram.com") ? `@${path}` : path;
}

/** OpenStreetMap link for a location. */
export function mapUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}
