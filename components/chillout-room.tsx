"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { MoreVertical, Share2, MapPin, Copy, Check, FlaskConical, Search, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ChilloutMapLoader } from "@/components/chillout-map-loader";

type Participant = {
  userId: number; name: string; email?: string; avatarColor?: string | null;
  isHost: boolean; sharing: boolean; simulated: boolean; updatedAt?: string | null;
};
type Loc = {
  userId: number; name: string; latitude: number; longitude: number;
  simulated: boolean; eta: { text: string; mode: string } | null;
};
type Place = { displayName: string; latitude: number; longitude: number };
type SimPos = { lat: number; lng: number; label: string };

const DEV_KEY = "chillouts-devmode";

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function ChilloutRoom({
  chillout, currentUserId, initialIsHost, myStatus,
}: {
  chillout: { id: number; title: string; description?: string | null; locationName?: string | null; latitude?: number | null; longitude?: number | null; status: string; inviteCode: string; hostId: number };
  currentUserId: number;
  initialIsHost: boolean;
  myStatus: string | null;
}) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [blocked, setBlocked] = useState<{ userId: number; name: string }[]>([]);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [meetup, setMeetup] = useState<{ latitude: number; longitude: number; name: string | null } | null>(
    chillout.latitude != null && chillout.longitude != null
      ? { latitude: chillout.latitude, longitude: chillout.longitude, name: chillout.locationName ?? null }
      : null
  );
  const [shareState, setShareState] = useState<"off" | "on" | "updating" | "denied" | "unavailable">("off");
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<Participant | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const watchId = useRef<number | null>(null);
  const [follow, setFollow] = useState(false);

  // ---- Developer Mode (server-gated; UI only renders when allowed) ----
  const [devAvail, setDevAvail] = useState(false);
  const [devOn, setDevOn] = useState(false);
  const [simPos, setSimPos] = useState<SimPos | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBlocked = myStatus === "BLOCKED";
  const isMember = initialIsHost || myStatus === "JOINED";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(DEV_KEY) === "on") {
          // restored below only if the server allows dev mode for this user
        }
      } catch { /* ignore */ }
      try {
        const r = await fetch(`/api/dev-mode`);
        const d = r.ok ? await r.json() : null;
        if (cancelled) return;
        if (d && d.devModeEnabled && d.isAdmin) {
          setDevAvail(true);
          try {
            if (localStorage.getItem(DEV_KEY) === "on") setDevOn(true);
          } catch { /* ignore */ }
        } else {
          setDevAvail(false);
          setDevOn(false);
        }
      } catch {
        if (!cancelled) setDevAvail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setDev(on: boolean) {
    setDevOn(on);
    try {
      localStorage.setItem(DEV_KEY, on ? "on" : "off");
    } catch { /* ignore */ }
    if (!on) {
      setPicking(false);
      setResults([]);
    }
  }

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, lRes] = await Promise.all([
        fetch(`/api/chillouts/${chillout.id}/participants`),
        fetch(`/api/chillouts/${chillout.id}/locations`),
      ]);
      if (pRes.ok) {
        const d = await pRes.json();
        setParticipants(d.active);
        setBlocked(d.blocked ?? []);
        setIsHost(d.isHost);
      } else if (pRes.status === 403) {
        const d = await pRes.json().catch(() => ({}));
        setActionError(d.error ?? "Access denied");
      }
      if (lRes.ok) {
        const d = await lRes.json();
        setLocations(d.locations ?? []);
        if (d.meetup) setMeetup(d.meetup);
      }
    } catch {
      // polling failures are non-fatal
    }
  }, [chillout.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
    const t = setInterval(fetchAll, 8000);
    return () => clearInterval(t);
  }, [fetchAll]);

  function stopWatch() {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  useEffect(() => stopWatch, []);

  async function pushLocation(lat: number, lng: number, acc?: number, source?: "real" | "simulated") {
    const res = await fetch(`/api/chillouts/${chillout.id}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: acc, source }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Location update rejected");
    }
  }

  async function startSharing() {
    setActionError(null);
    // Developer Mode: push the developer-selected coordinates instead of GPS.
    if (devAvail && devOn) {
      if (!simPos) {
        setActionError("Developer Mode is ON — search for a place or pick a point on the map first.");
        return;
      }
      setShareState("updating");
      try {
        await pushLocation(simPos.lat, simPos.lng, undefined, "simulated");
        setShareState("on");
        setFollow(true);
        toast.success("Sharing simulated location");
        fetchAll();
      } catch (e) {
        setShareState("off");
        setActionError(e instanceof Error ? e.message : "Unable to share location");
      }
      return;
    }
    if (!("geolocation" in navigator)) {
      setShareState("unavailable");
      setActionError("Location unavailable in this browser");
      return;
    }
    setShareState("updating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          await pushLocation(latitude, longitude, accuracy, "real");
          setShareState("on");
          setFollow(true);
          toast.success("Sharing your location");
          fetchAll();
          watchId.current = navigator.geolocation.watchPosition(
            async (p) => {
              try {
                await pushLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy, "real");
                fetchAll();
              } catch {
                // keep sharing; next tick retries
              }
            },
            () => setShareState("unavailable"),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
          );
        } catch (e) {
          setShareState("off");
          setActionError(e instanceof Error ? e.message : "Unable to share location");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setShareState("denied");
          setActionError("Location permission denied — allow access to share");
        } else {
          setShareState("unavailable");
          setActionError("Location temporarily unavailable");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function stopSharing() {
    stopWatch();
    await fetch(`/api/chillouts/${chillout.id}/location`, { method: "DELETE" }).catch(() => {});
    setShareState("off");
    setFollow(false);
    toast.success("Location sharing off");
    fetchAll();
  }

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      const d = await res.json().catch(() => ({}));
      if (res.ok) setResults(d.results ?? []);
      else {
        setResults([]);
        setActionError(d.error ?? "Search failed");
      }
    } finally {
      setSearching(false);
    }
  }

  function onQueryChange(v: string) {
    setQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(v), 500);
  }

  function pickPlace(p: Place) {
    setSimPos({ lat: p.latitude, lng: p.longitude, label: p.displayName.split(",").slice(0, 2).join(",") });
    setResults([]);
    setQuery("");
    setPicking(false);
    setFollow(true);
  }

  function onMapPick(lat: number, lng: number) {
    setSimPos({ lat, lng, label: `Pinned ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    setPicking(false);
    setFollow(true);
    toast.success("Simulated location set from map");
  }

  async function join() {
    setActionError(null);
    const res = await fetch(`/api/chillouts/${chillout.id}/join`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(d.error ?? "Unable to join");
      return;
    }
    toast.success("Joined ChillOut");
    router.refresh();
    fetchAll();
  }

  async function leave() {
    const res = await fetch(`/api/chillouts/${chillout.id}/leave`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(d.error ?? "Unable to leave");
      return;
    }
    stopWatch();
    toast.success("Left ChillOut");
    router.refresh();
    fetchAll();
  }

  async function endChillout() {
    const res = await fetch(`/api/chillouts/${chillout.id}/end`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Unable to end ChillOut");
      return;
    }
    toast.success("ChillOut ended");
    router.refresh();
  }

  async function confirmBlock() {
    if (!blockTarget) return;
    setBlocking(true);
    try {
      const res = await fetch(`/api/chillouts/${chillout.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: blockTarget.userId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Unable to block participant");
      toast.success(`${blockTarget.name} blocked`);
      setBlockTarget(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Blocking failed");
    } finally {
      setBlocking(false);
    }
  }

  async function unblock(userId: number) {
    const res = await fetch(`/api/chillouts/${chillout.id}/unblock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Unable to unblock");
      return;
    }
    toast.success("Participant unblocked");
    fetchAll();
  }

  const etaByUser = new Map(locations.map((l) => [l.userId, l.eta]));
  const selfLoc = locations.find((l) => l.userId === currentUserId);

  const center: [number, number] =
    follow && selfLoc ? [selfLoc.latitude, selfLoc.longitude]
    : meetup ? [meetup.latitude, meetup.longitude]
    : locations[0] ? [locations[0].latitude, locations[0].longitude]
    : [12.9716, 77.5946];

  const mapPoints = locations.map((l) => ({
    userId: l.userId, name: l.name, latitude: l.latitude, longitude: l.longitude,
    self: l.userId === currentUserId, simulated: l.simulated,
  }));

  const joinUrl = `${appBaseUrl()}/chillouts/${chillout.id}`;

  return (
    <div className="w-full max-w-[480px] space-y-6">
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      )}
      {isBlocked && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          You have been blocked from this ChillOut. You can no longer participate or share location.
        </div>
      )}

      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-[#f43f5e]" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Map</h2>
          </div>
          <Badge variant="secondary">© OpenStreetMap</Badge>
        </div>
        <div id="chillout-map">
          <ChilloutMapLoader
            meetup={meetup}
            points={mapPoints}
            center={center}
            picking={devAvail && devOn && picking}
            onPick={onMapPick}
            onUserPan={() => setFollow(false)}
            follow={follow}
          />
        </div>
        <p className="text-[11px] text-slate-400">
          Meetup marker is fixed. Participant markers appear only for authorized, sharing-enabled, non-blocked members.
          {devAvail && devOn && " Violet markers are simulated (Developer Mode)."}
        </p>
      </section>

      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Location Sharing</h2>
          <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200/80">
            {shareState === "on"
              ? devAvail && devOn ? "On · Simulated" : "On"
              : shareState === "updating" ? "Updating..." : shareState === "denied" ? "Denied" : shareState === "unavailable" ? "Unavailable" : "Off"}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {shareState === "on"
            ? devAvail && devOn ? "On — others see your simulated location." : "On — other participants can see you."
            : "Off — your location is private."}
        </p>
        {!isMember || isBlocked ? (
          <p className="text-xs text-slate-500">Join this ChillOut to share your location.</p>
        ) : shareState === "on" ? (
          <Button onClick={stopSharing} variant="outline" className="w-full">Stop Sharing Location</Button>
        ) : (
          <Button onClick={startSharing} disabled={shareState === "updating"} className="w-full bg-[#f43f5e] hover:bg-[#e11d48]">
            {shareState === "updating" ? "Updating location..." : devAvail && devOn ? "Share Simulated Location" : "Start Sharing Location"}
          </Button>
        )}
      </section>

      {devAvail && (
        <section className="bg-violet-50/60 rounded-2xl p-5 border border-violet-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-violet-900 tracking-tight flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4" /> Developer Mode
            </h2>
            <Button size="sm" variant={devOn ? "default" : "outline"} onClick={() => setDev(!devOn)}>
              {devOn ? "ON" : "OFF"}
            </Button>
          </div>
          <p className="text-[11px] text-violet-700/80">
            {devOn ? "Location simulation enabled — your shares use the simulated point below, never GPS." : "Enable simulated locations for testing."}
          </p>
          {devOn && (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Search for a place..."
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(query); } }}
                  aria-label="Search for a place"
                />
                <Button size="sm" variant="outline" onClick={() => runSearch(query)} disabled={searching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {searching && <p className="text-xs text-violet-700/70">Searching…</p>}
              {results.length > 0 && (
                <div className="bg-white rounded-xl border border-violet-200 divide-y divide-slate-100 overflow-hidden">
                  {results.map((r, i) => (
                    <button
                      key={`${r.latitude},${r.longitude},${i}`}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50"
                      onClick={() => pickPlace(r)}
                    >
                      <span className="font-medium text-slate-800 line-clamp-2">{r.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" variant={picking ? "default" : "outline"} onClick={() => setPicking((p) => !p)}>
                  <MapPinned className="w-4 h-4 mr-1" /> {picking ? "Tap the map…" : "Pick on map"}
                </Button>
                {simPos && (
                  <Button size="sm" variant="ghost" onClick={() => setSimPos(null)}>
                    Clear
                  </Button>
                )}
              </div>
              {simPos && (
                <p className="text-xs text-violet-900 bg-white rounded-xl border border-violet-200 px-3 py-2">
                  Simulated location: <strong>{simPos.label}</strong>
                </p>
              )}
            </>
          )}
        </section>
      )}

      {!isMember && !isBlocked && chillout.status === "ACTIVE" && (
        <Button onClick={join} className="w-full bg-[#f43f5e] hover:bg-[#e11d48]">Join ChillOut</Button>
      )}

      <section className="space-y-2.5">
        <div className="flex items-center justify-between pb-0.5">
          <h3 className="font-condensed text-lg font-bold text-slate-900 uppercase tracking-wide">
            Attendees {participants ? `(${participants.length})` : ""}
          </h3>
          {isHost && <span className="text-xs text-slate-500">Blocked Users ({blocked.length})</span>}
        </div>
        {isHost && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] text-slate-500">
            <span>Host controls: open ⋮ on a participant to moderate.</span>
            <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">Host Only</span>
          </div>
        )}
        {participants === null ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : participants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-9 px-6 text-center">
            <p className="text-[13px] font-semibold text-slate-600">You&apos;re the first one here.</p>
            <p className="text-[13px] text-slate-400 mt-1">Share the QR code to invite people.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
            {participants.map((p) => {
              const eta = etaByUser.get(p.userId);
              return (
                <div key={p.userId} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center select-none"
                      style={{ background: p.avatarColor ?? "#fce7ed", color: "#9f1239" }}>
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {p.name}{p.userId === currentUserId ? " (You)" : ""}
                        </span>
                        {p.isHost && <span className="px-1.5 py-0.5 bg-rose-100 text-[#f43f5e] text-[10px] font-bold rounded uppercase">Host</span>}
                        {p.simulated && <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded uppercase">Sim</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.sharing
                          ? eta ? `${eta.text}${eta.mode === "straight-line" ? " (straight-line)" : ""}` : "Sharing location"
                          : "Not sharing"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={p.sharing ? "default" : "secondary"}>{p.sharing ? "Here" : "Away"}</Badge>
                    {isHost && !p.isHost && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          aria-label={`Moderate ${p.name}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info(`${p.name} — ${p.email ?? "no email"}`)}>
                            View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => document.getElementById("chillout-map")?.scrollIntoView({ behavior: "smooth" })}>
                            View on map
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => setBlockTarget(p)}>
                            Block participant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isHost && blocked.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <p className="px-4 pt-3 text-xs font-semibold text-slate-500 uppercase">Blocked participants</p>
            {blocked.map((b) => (
              <div key={b.userId} className="p-3.5 flex items-center justify-between">
                <span className="text-sm font-medium">{b.name}</span>
                <Button size="sm" variant="outline" onClick={() => unblock(b.userId)}>Unblock</Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 py-3.5 px-4 bg-white/95 backdrop-blur border-t border-slate-200/80 flex justify-center z-40">
        <div className="w-full max-w-[480px] flex items-center gap-3">
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogTrigger render={<Button className="flex-1 bg-[#f43f5e] hover:bg-[#e11d48]" />}>
              <Share2 className="w-4 h-4 mr-2" />Share
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Invite people</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-3 py-2">
                <QRCodeSVG value={joinUrl} size={180} />
                <p className="text-sm font-mono bg-slate-100 rounded px-2 py-1">{chillout.inviteCode}</p>
                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(joinUrl).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {isHost ? (
            <Button variant="outline" className="flex-1 text-[#f43f5e]" onClick={endChillout} disabled={chillout.status !== "ACTIVE"}>
              {chillout.status === "ACTIVE" ? "End ChillOut" : "Ended"}
            </Button>
          ) : isMember ? (
            <Button variant="outline" className="flex-1" onClick={leave}>Leave</Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={join}>Join</Button>
          )}
        </div>
      </footer>

      <AlertDialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {blockTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.name} will lose access to this ChillOut and their live location will stop being shared with other participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock} disabled={blocking} className="bg-red-600 hover:bg-red-700">
              {blocking ? "Blocking..." : "Block participant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
