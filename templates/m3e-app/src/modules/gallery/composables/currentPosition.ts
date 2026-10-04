export type PositionFailure = "unsupported" | "denied" | "unavailable" | "timeout";

export class PositionError extends Error {
  constructor(readonly reason: PositionFailure) {
    super(`location ${reason}`);
    this.name = "PositionError";
  }
}

const REASONS: Record<number, PositionFailure> = { 1: "denied", 2: "unavailable", 3: "timeout" };

/**
 * Where the device is, through the WebView's own geolocation - no plugin. Coarse first: a fix from
 * the network comes back in a second where GPS can take a minute, and a shared pin needs no more.
 * On Android the app's manifest must declare `ACCESS_COARSE_LOCATION` (and `ACCESS_FINE_LOCATION`
 * for precise fixes); Capacitor's web view then asks the person for permission when this runs.
 */
export function currentPosition(timeout = 10_000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new PositionError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new PositionError(REASONS[error.code] ?? "unavailable")),
      { enableHighAccuracy: false, timeout, maximumAge: 60_000 },
    );
  });
}

/** A link that opens a place in the maps app the person uses. */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
