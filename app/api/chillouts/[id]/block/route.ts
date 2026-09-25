import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getChilloutContext, parseChilloutId } from "@/lib/chillout-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!c.isHost) return NextResponse.json({ error: "Only the host can perform this action" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const targetId = Number(body.userId);
  if (!Number.isInteger(targetId)) return NextResponse.json({ error: "Invalid participant" }, { status: 400 });
  if (targetId === c.chillout.hostId) return NextResponse.json({ error: "You can't block yourself" }, { status: 400 });

  const existing = await db.participation.findUnique({
    where: { chilloutId_userId: { chilloutId, userId: targetId } },
  });
  if (!existing) return NextResponse.json({ error: "That user is not a participant" }, { status: 404 });

  await db.participation.update({
    where: { chilloutId_userId: { chilloutId, userId: targetId } },
    data: { status: "BLOCKED" },
  });
  // Stop their sharing + remove marker immediately
  await db.locationShare.deleteMany({ where: { chilloutId, userId: targetId } });
  return NextResponse.json({ ok: true });
}
