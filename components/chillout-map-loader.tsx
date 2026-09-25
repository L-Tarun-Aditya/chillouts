"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { ChilloutMapProps } from "@/components/chillout-map-impl";

type MapComponent = ComponentType<ChilloutMapProps>;

/**
 * Client-only loader for the Leaflet map. The dynamic import runs inside
 * useEffect, which never executes during SSR, so Leaflet's window access
 * can never break prerendering. Fully typed (no next/dynamic union quirk).
 */
export function ChilloutMapLoader(props: ChilloutMapProps) {
  const [Comp, setComp] = useState<MapComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/components/chillout-map-impl").then((m) => {
      if (!cancelled) setComp(() => m.ChilloutMap);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Comp) {
    return <div className="h-64 w-full rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" aria-label="Loading map" />;
  }
  return <Comp {...props} />;
}
