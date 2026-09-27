"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { LocationPickerMapProps } from "@/components/location-picker-map-impl";

type MapComponent = ComponentType<LocationPickerMapProps>;

/**
 * Client-only loader for the location picker map.
 * Dynamic import inside useEffect ensures Leaflet never runs during SSR.
 */
export function LocationPickerMap(props: LocationPickerMapProps) {
  const [Comp, setComp] = useState<MapComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/components/location-picker-map-impl").then((m) => {
      if (!cancelled) setComp(() => m.LocationPickerMapImpl);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Comp) {
    return (
      <div
        className="h-44 w-full rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
        aria-label="Loading map"
      />
    );
  }
  return <Comp {...props} />;
}
