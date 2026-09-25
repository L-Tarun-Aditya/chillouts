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

  await db.participation.updateMany({
    where: { chilloutId, userId: targetId, status: "BLOCKED" },
    data: { status: "LEFT" },
  });
  return NextResponse.json({ ok: true });
}
