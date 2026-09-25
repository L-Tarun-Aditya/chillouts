import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getChilloutContext, parseChilloutId } from "@/lib/chillout-auth";

// Join
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
  if (!c.chillout) return NextResponse.json({ error: "This ChillOut no longer exists" }, { status: 404 });
  if (c.chillout.status !== "ACTIVE") return NextResponse.json({ error: "This ChillOut has ended" }, { status: 410 });
  if (c.isHost) return NextResponse.json({ error: "Hosts don't need to join their own ChillOut" }, { status: 400 });
  if (c.isBlocked) return NextResponse.json({ error: "You have been blocked from this ChillOut" }, { status: 403 });
  if (c.participation?.status === "JOINED") return NextResponse.json({ ok: true, already: true });

  // Capacity check
  if (c.chillout.maxPeople) {
    const count = await db.participation.count({ where: { chilloutId, status: "JOINED" } });
    if (count >= c.chillout.maxPeople) return NextResponse.json({ error: "This ChillOut is full" }, { status: 409 });
  }

  await db.participation.upsert({
    where: { chilloutId_userId: { chilloutId, userId: user.id } },
    update: { status: "JOINED" },
    create: { chilloutId, userId: user.id, status: "JOINED" },
  });
  return NextResponse.json({ ok: true });
}
