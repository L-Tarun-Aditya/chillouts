import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getChilloutContext, parseChilloutId } from "@/lib/chillout-auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (c.isHost) return NextResponse.json({ error: "Hosts can't leave — End the ChillOut instead" }, { status: 400 });

  await db.participation.updateMany({
    where: { chilloutId, userId: user.id },
    data: { status: "LEFT" },
  });
  // Stop sharing: remove live marker
  await db.locationShare.deleteMany({ where: { chilloutId, userId: user.id } });
  return NextResponse.json({ ok: true });
}
