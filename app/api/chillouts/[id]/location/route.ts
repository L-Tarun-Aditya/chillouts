import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getChilloutContext, parseChilloutId } from "@/lib/chillout-auth";
import { updateLocationSchema } from "@/lib/validation";
import { canUseDevMode } from "@/lib/dev-mode";

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
  if (c.isBlocked) return NextResponse.json({ error: "You have been blocked from this ChillOut" }, { status: 403 });
  if (!c.isMember) return NextResponse.json({ error: "Join this ChillOut before sharing location" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid coordinates" }, { status: 400 });
  }
  const { latitude, longitude, accuracy, sharingEnabled } = parsed.data;

  if (sharingEnabled === false) {
    await db.locationShare.deleteMany({ where: { chilloutId, userId: user.id } });
    return NextResponse.json({ ok: true, sharing: false });
  }

  // Developer Mode coordinates are accepted only when the SERVER permits them
  // for this user. The isSimulated marker is server-derived — a client flag
  // alone never marks a row simulated.
  let isSimulated = false;
  if (parsed.data.source === "simulated") {
    const session = await auth();
    if (!canUseDevMode(session?.user?.email)) {
      return NextResponse.json({ error: "Location simulation is not available" }, { status: 403 });
    }
    isSimulated = true;
  }

  await db.locationShare.upsert({
    where: { chilloutId_userId: { chilloutId, userId: user.id } },
    update: { latitude, longitude, accuracy, sharingEnabled: true, isSimulated },
    create: { chilloutId, userId: user.id, latitude, longitude, accuracy, sharingEnabled: true, isSimulated },
  });
  return NextResponse.json({ ok: true, sharing: true, simulated: isSimulated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const chilloutId = parseChilloutId(id);
  if (chilloutId === null) return NextResponse.json({ error: "This ChillOut no longer exists" }, { status: 404 });
  await db.locationShare.deleteMany({ where: { chilloutId, userId: user.id } });
  return NextResponse.json({ ok: true, sharing: false });
}
