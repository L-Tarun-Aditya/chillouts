import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getChilloutContext, parseChilloutId } from "@/lib/chillout-auth";
import { getEta } from "@/lib/routing";

// Only authorized, sharing-enabled, non-blocked locations, each annotated
// with driving ETA to the meetup (same calculation in real and dev mode).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const chilloutId = parseChilloutId(id);
  if (chilloutId === null) return NextResponse.json({ error: "This ChillOut no longer exists" }, { status: 404 });
  const c = await getChilloutContext(chilloutId, user.id);
  if (!c.chillout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (c.isBlocked) return NextResponse.json({ error: "You have been blocked from this ChillOut" }, { status: 403 });
  if (!c.isMember) return NextResponse.json({ error: "Join this ChillOut to see locations" }, { status: 403 });

  // Blocked user ids must never leak locations
  const blockedRows = await db.participation.findMany({
    where: { chilloutId, status: "BLOCKED" },
    select: { userId: true },
  });
  const blockedIds = new Set(blockedRows.map((r) => r.userId));

  const shares = await db.locationShare.findMany({
    where: { chilloutId, sharingEnabled: true },
    include: { user: { select: { id: true, name: true } } },
  });

  const meetup =
    c.chillout.latitude != null && c.chillout.longitude != null
      ? { latitude: c.chillout.latitude, longitude: c.chillout.longitude, name: c.chillout.locationName }
      : null;

  const visibleShares = shares.filter((s) => !blockedIds.has(s.userId));

  const visible = await Promise.all(
    visibleShares.map(async (s) => ({
      userId: s.userId,
      name: s.user.name,
      latitude: s.latitude,
      longitude: s.longitude,
      accuracy: s.accuracy,
      simulated: s.isSimulated,
      updatedAt: s.updatedAt.toISOString(),
      eta: meetup ? await getEta(s.latitude, s.longitude, meetup.latitude, meetup.longitude) : null,
    }))
  );

  return NextResponse.json({ meetup, locations: visible });
}
