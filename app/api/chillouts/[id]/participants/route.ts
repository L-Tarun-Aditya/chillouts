import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getChilloutContext, parseChilloutId } from "@/lib/chillout-auth";

// Participants visible to authorized viewers.
// Blocked users are NEVER in the active list; hosts get a separate blocked list.
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
  if (!c.isMember) return NextResponse.json({ error: "Join this ChillOut to see participants" }, { status: 403 });

  const rows = await db.participation.findMany({
    where: { chilloutId, status: "JOINED" },
    // Emails are host-only: members see names/avatars, not contact details.
    include: {
      user: {
        select: c.isHost
          ? { id: true, name: true, email: true, avatarColor: true }
          : { id: true, name: true, avatarColor: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
  const shares = await db.locationShare.findMany({ where: { chilloutId, sharingEnabled: true } });
  const sharingByUser = new Map(shares.map((s) => [s.userId, s]));

  const active = [
    {
      userId: c.chillout.hostId,
      name: c.chillout.host.name,
      email: c.isHost ? c.chillout.host.email : undefined,
      avatarColor: c.chillout.host.avatarColor,
      isHost: true,
      sharing: sharingByUser.has(c.chillout.hostId),
      simulated: sharingByUser.get(c.chillout.hostId)?.isSimulated ?? false,
      updatedAt: sharingByUser.get(c.chillout.hostId)?.updatedAt ?? null,
    },
    ...rows
      .filter((r) => r.userId !== c.chillout!.hostId)
      .map((r) => ({
        userId: r.user.id,
        name: r.user.name,
        email: "email" in r.user ? (r.user.email as string) : undefined,
        avatarColor: r.user.avatarColor,
        isHost: false,
        sharing: sharingByUser.has(r.user.id),
        simulated: sharingByUser.get(r.user.id)?.isSimulated ?? false,
        updatedAt: sharingByUser.get(r.user.id)?.updatedAt ?? null,
      })),
  ];

  let blocked: { userId: number; name: string; blockedAt: string }[] = [];
  if (c.isHost) {
    const b = await db.participation.findMany({
      where: { chilloutId, status: "BLOCKED" },
      include: { user: { select: { id: true, name: true } } },
    });
    blocked = b.map((r) => ({ userId: r.user.id, name: r.user.name, blockedAt: r.updatedAt.toISOString() }));
  }
  return NextResponse.json({ active, blocked, isHost: c.isHost });
}
