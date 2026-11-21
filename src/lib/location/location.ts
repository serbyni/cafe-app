/* Phone location for table orders: only sent to the database to be compared, never stored. */

export type Spot = { lat: number; lng: number; accuracy: number };
export type SpotError = "denied" | "unavailable" | "timeout" | "unsupported";

/** GeolocationPositionError code → our error (1 denied, 2 unavailable, 3 timeout). */
export function spotError(code: number): SpotError {
  return code === 1 ? "denied" : code === 3 ? "timeout" : "unavailable";
}

/** Asks the browser for the phone's position (high accuracy, 15 s, a position ≤ 30 s old is fine). */
export function locate(): Promise<Spot | SpotError> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator))
    return Promise.resolve("unsupported");
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
        }),
      (e) => resolve(spotError(e.code)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    ),
  );
}

export const isSpot = (v: Spot | SpotError): v is Spot => typeof v === "object";
