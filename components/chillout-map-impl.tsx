"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  userId: number;
  name: string;
  latitude: number;
  longitude: number;
  self?: boolean;
  simulated?: boolean;
};

// Fix default marker icons for bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Distinct simulated-location marker (violet, cannot be mistaken for GPS).
const SimulatedIcon = L.divIcon({
  className: "chillout-sim-marker",
  html: `<div style="width:26px;height:26px;border-radius:9999px;background:#8b5cf6;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;font-family:sans-serif">D</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function MapInteractions({
  picking,
  onPick,
  onUserPan,
}: {
  picking: boolean;
  onPick: (lat: number, lng: number) => void;
  onUserPan: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    map.on("dragstart", onUserPan);
    return () => {
      map.off("dragstart", onUserPan);
    };
  }, [map, onUserPan]);
  useMapEvents({
    click(e) {
      if (!picking) return;
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
      onPick(lat, lng);
    },
  });
  return null;
}

function Recenter({ center, follow }: { center: [number, number]; follow: boolean }) {
  const map = useMap();
  const last = useRef("");
  useEffect(() => {
    const k = center.join(",");
    if (follow && k !== last.current) {
      last.current = k;
      map.setView(center, Math.max(map.getZoom(), 14));
    }
  }, [center, follow, map]);
  return null;
}

export type ChilloutMapProps = {
  meetup: { latitude: number; longitude: number; name: string | null } | null;
  points: MapPoint[];
  center: [number, number];
  picking?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onUserPan?: () => void;
  follow?: boolean;
};

export function ChilloutMap({
  meetup,
  points,
  center,
  picking = false,
  onPick,
  onUserPan,
  follow = false,
}: ChilloutMapProps) {
  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom className="h-64 w-full rounded-2xl border border-slate-200 z-0" attributionControl>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      />
      <MapInteractions
        picking={picking}
        onPick={(lat, lng) => onPick?.(lat, lng)}
        onUserPan={() => onUserPan?.()}
      />
      <Recenter center={center} follow={follow} />
      {meetup && (
        <Marker position={[meetup.latitude, meetup.longitude]}>
          <Popup>
            <strong>Meetup</strong>
            <br />
            {meetup.name ?? "ChillOut location"}
          </Popup>
        </Marker>
      )}
      {points.map((p) => (
        <Marker
          key={p.userId}
          position={[p.latitude, p.longitude]}
          {...(p.simulated ? { icon: SimulatedIcon } : {})}
        >
          <Popup>
            <strong>{p.name}</strong>
            {p.self ? " (you)" : ""}
            {p.simulated ? (
              <>
                <br />
                <em>Simulated location (Developer Mode)</em>
              </>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
