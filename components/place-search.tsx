"use client";

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Photon geocoder — search-as-you-type using OSM data.
// Public Nominatim explicitly prohibits client-side autocomplete; Photon
// (photon.komoot.io) is designed for it.
// ---------------------------------------------------------------------------

const PHOTON_BASE = "https://photon.komoot.io/api/";
const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 400;
const MAX_RESULTS = 5;

export interface PlaceResult {
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
}

/** Build a human-readable label from a Photon feature's properties. */
function buildLabel(props: Record<string, unknown>): { displayName: string; shortName: string } {
  const parts: string[] = [];
  const secondary: string[] = [];

  const name = typeof props.name === "string" ? props.name : "";
  const street = typeof props.street === "string" ? props.street : "";
  const housenumber = typeof props.housenumber === "string" ? props.housenumber : "";
  const district = typeof props.district === "string" ? props.district : "";
  const city = typeof props.city === "string" ? props.city : "";
  const state = typeof props.state === "string" ? props.state : "";
  const country = typeof props.country === "string" ? props.country : "";

  // Primary line
  if (name) parts.push(name);
  else if (street) parts.push(housenumber ? `${housenumber} ${street}` : street);

  // Secondary line
  if (street && name) secondary.push(housenumber ? `${housenumber} ${street}` : street);
  if (district && district !== city) secondary.push(district);
  if (city) secondary.push(city);
  if (state && state !== city) secondary.push(state);
  if (country) secondary.push(country);

  const shortName = parts[0] || secondary[0] || "Unknown place";
  const displayName = secondary.length
    ? `${shortName} — ${secondary.join(", ")}`
    : shortName;

  return { displayName, shortName };
}

interface PlaceSearchProps {
  label?: string;
  placeholder?: string;
  fieldClassName?: string;
  /** Called when a suggestion is selected. */
  onSelect: (result: PlaceResult) => void;
  /** Called when the field is cleared. */
  onClear: () => void;
  /** Optional bias coordinates (user's current location if available). */
  biasLat?: number;
  biasLon?: number;
}

export function PlaceSearch({
  label = "Where (optional)",
  placeholder = "Search for a place…",
  fieldClassName,
  onSelect,
  onClear,
  biasLat,
  biasLon,
}: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selected, setSelected] = useState<PlaceResult | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < MIN_QUERY_LEN) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      // Cancel previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);

      try {
        const url = new URL(PHOTON_BASE);
        url.searchParams.set("q", q.trim());
        url.searchParams.set("limit", String(MAX_RESULTS));
        if (biasLat != null && biasLon != null) {
          url.searchParams.set("lat", String(biasLat));
          url.searchParams.set("lon", String(biasLon));
        }

        const res = await fetch(url.toString(), {
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`Photon responded ${res.status}`);

        const json = await res.json() as { features?: unknown[] };
        const features = Array.isArray(json.features) ? json.features : [];

        const results: PlaceResult[] = features
          .filter((f): f is { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> } =>
            typeof f === "object" && f !== null &&
            "geometry" in f && "properties" in f
          )
          .map((f) => {
            const [lon, lat] = f.geometry.coordinates;
            const { displayName, shortName } = buildLabel(f.properties);
            return { displayName, shortName, latitude: lat, longitude: lon };
          });

        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIdx(-1);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return; // stale request, ignore
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [biasLat, biasLon]
  );

  function handleChange(value: string) {
    setQuery(value);
    setSelected(null);
    onClear();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => search(value), DEBOUNCE_MS);
  }

  function handleSelect(result: PlaceResult) {
    setSelected(result);
    setQuery(result.shortName);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
    setLoading(false);
    onSelect(result);
    inputRef.current?.blur();
  }

  function handleClear() {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setOpen(false);
    setLoading(false);
    onClear();
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        e.preventDefault(); // prevent form submit
        handleSelect(suggestions[activeIdx]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor="place-search" className="block text-[13px] font-semibold mb-1.5">
        {label}
      </Label>
      <div className="relative">
        <Input
          id="place-search"
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          className={fieldClassName}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="place-suggestions"
          aria-activedescendant={activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined}
        />
        {/* Right-side icon: spinner while loading, X to clear if text present, pin if selected */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          {!loading && selected && <MapPin className="w-4 h-4 text-[#f43f5e]" />}
        </div>
        {!loading && query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear location"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && (
        <ul
          id="place-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
        >
          {suggestions.length === 0 && !loading && (
            <li className="px-4 py-3 text-sm text-slate-500">No places found</li>
          )}
          {suggestions.map((s, i) => {
            const [primary, ...rest] = s.displayName.split(" — ");
            return (
              <li
                key={i}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before click
                  handleSelect(s);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  i === activeIdx ? "bg-[#fef2f4]" : "hover:bg-slate-50"
                }`}
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#f43f5e]" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{primary}</p>
                  {rest.length > 0 && (
                    <p className="text-[12px] text-slate-500 truncate">{rest.join(" — ")}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Selected badge */}
      {selected && (
        <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#f43f5e] shrink-0" />
          <span className="truncate">{selected.displayName}</span>
        </p>
      )}
    </div>
  );
}
