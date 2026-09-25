import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createChilloutSchema } from "@/lib/validation";
import { makeInviteCode } from "@/lib/chillouts";

export async function GET() {
  const chillouts = await db.chillout.findMany({
    orderBy: { createdAt: "desc" },
    include: { host: { select: { id: true, name: true } } },
    take: 50,
  });
  return NextResponse.json(chillouts);
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  // Normalize maxPeople: accept number, numeric string, or "No limit"/empty -> undefined
  let maxPeople = body.maxPeople;
  if (typeof maxPeople === "string") {
    const t = maxPeople.trim().toLowerCase();
    if (t === "" || t === "no limit" || t === "nolimit") maxPeople = undefined;
    else {
      const n = parseInt(t, 10);
      maxPeople = Number.isNaN(n) ? undefined : n;
    }
  }
  const parsed = createChilloutSchema.safeParse({ ...body, maxPeople });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  // Update user's display name from "Your name" field (reference collects it here)
  if (data.hostName && data.hostName !== user.name) {
    await db.user.update({ where: { id: user.id }, data: { name: data.hostName } });
  }

  let inviteCode = makeInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db.chillout.findUnique({ where: { inviteCode } });
    if (!exists) break;
    inviteCode = makeInviteCode();
  }

  const chillout = await db.chillout.create({
    data: {
      title: data.title,
      description: data.description,
      hostId: user.id,
      locationName: data.locationName,
      latitude: data.latitude,
      longitude: data.longitude,
      maxPeople: data.maxPeople,
      inviteCode,
    },
  });
  return NextResponse.json(chillout, { status: 201 });
}
