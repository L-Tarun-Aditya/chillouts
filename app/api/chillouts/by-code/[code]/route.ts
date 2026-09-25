import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const chillout = await db.chillout.findUnique({ where: { inviteCode: code.toUpperCase() } });
  if (!chillout) return NextResponse.json({ error: "No ChillOut found for that code" }, { status: 404 });
  return NextResponse.json({ id: chillout.id });
}
