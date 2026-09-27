"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Reuse the same default icon fix as chillout-map-impl
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  const last = useRef<string>("");
  useEffect(() => {
    const k = center.join(",");
    if (k !== last.current) {
      last.current = k;
      map.flyTo(center, 15, { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

export type LocationPickerMapProps = {
  latitude: number;
  longitude: number;
  label?: string;
};

export function LocationPickerMapImpl({ latitude, longitude, label }: LocationPickerMapProps) {
  const center: [number, number] = [latitude, longitude];
  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={false}
      className="h-44 w-full rounded-xl border border-slate-200 z-0"
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      />
      <FlyTo center={center} />
      <Marker position={center} />
    </MapContainer>
  );
}
