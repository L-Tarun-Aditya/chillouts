// Server-only Nominatim proxy helper.
// Policy compliance: no per-keystroke client autocomplete. All searches go
// through the /api/geocode route: explicit query, min length, debounced
// client-side, app-wide <=1 req/s throttle + result cache here.

export type PlaceResult = {
  displayName: string;
  latitude: number;
  longitude: number;
  boundingBox?: [number, number, number, number];
};

// Bengaluru bias window (lon-min, lat-max, lon-max, lat-min for viewbox).
const BLR_VIEWBOX = "77.35,13.20,77.85,12.75";

const cache = new Map<string, { at: number; results: PlaceResult[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 200;
let lastUpstreamAt = 0;

function throttleWait(): number {
  const gap = Date.now() - lastUpstreamAt;
  return gap >= 1100 ? 0 : 1100 - gap;
}

export async function searchPlaces(rawQuery: string): Promise<PlaceResult[]> {
  const query = rawQuery.trim().slice(0, 120);
  if (query.length < 3) return [];
  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.results;

  const wait = throttleWait();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "in",
    viewbox: BLR_VIEWBOX,
    bounded: "0",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      signal: controller.signal,
      headers: {
        // Nominatim policy: valid identifying User-Agent required.
        "User-Agent": "ChilloutsDev/1.0 (local development testing; contact: admin@localhost)",
        Referer: "http://localhost:3000/",
        Accept: "application/json",
      },
    });
    lastUpstreamAt = Date.now();
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      boundingbox?: [string, string, string, string];
    }>;
    const results: PlaceResult[] = [];
    for (const d of Array.isArray(data) ? data : []) {
      const latitude = Number(d.lat);
      const longitude = Number(d.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;
      const bb = d.boundingbox?.map(Number);
      const boundingBox: [number, number, number, number] | undefined =
        bb && bb.length === 4 && bb.every(Number.isFinite)
          ? [bb[0], bb[1], bb[2], bb[3]]
          : undefined;
      results.push({ displayName: d.display_name, latitude, longitude, boundingBox });
    }
    cache.set(key, { at: Date.now(), results });
    if (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
