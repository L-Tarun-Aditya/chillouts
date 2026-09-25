import { haversineMeters } from "@/lib/chillouts";

export type Eta = {
  mode: "driving" | "straight-line";
  durationSec: number | null;
  distanceM: number;
  text: string;
};

type CacheEntry = { at: number; eta: Eta };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;
const MAX_CACHE = 500;

export function formatDuration(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function key(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const r = (n: number) => n.toFixed(4);
  return `${r(fromLat)},${r(fromLng)}>${r(toLat)},${r(toLng)}`;
}

function fallbackEta(fromLat: number, fromLng: number, toLat: number, toLng: number): Eta {
  const distanceM = haversineMeters(fromLat, fromLng, toLat, toLng);
  return { mode: "straight-line", durationSec: null, distanceM, text: `${formatDistance(distanceM)} away` };
}

/** Driving ETA from OSRM (public demo server, cached). Never throws: falls back to straight-line distance. */
export async function getEta(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<Eta> {
  const k = key(fromLat, fromLng, toLat, toLng);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.eta;

  const fallback = fallbackEta(fromLat, fromLng, toLat, toLng);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "ChilloutsDev/1.0 (local development testing)", Accept: "application/json" },
      });
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        code?: string;
        routes?: Array<{ duration?: number; distance?: number }>;
      };
      const route = data.code === "Ok" ? data.routes?.[0] : undefined;
      if (!route || typeof route.duration !== "number" || typeof route.distance !== "number") {
        return fallback;
      }
      const eta: Eta = {
        mode: "driving",
        durationSec: Math.round(route.duration),
        distanceM: route.distance,
        text: `~${formatDuration(route.duration)} · ${formatDistance(route.distance)}`,
      };
      cache.set(k, { at: Date.now(), eta });
      if (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      return eta;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return fallback;
  }
}
