import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { NextResponse } from "next/server";
import { canUseDevMode, isDevModeEnabled } from "@/lib/dev-mode";

// Safe to expose: booleans only, derived server-side. Never trust client claims.
export async function GET() {
  const session = await getServerSession(authOptions);
  return NextResponse.json({
    devModeEnabled: isDevModeEnabled(),
    isAdmin: canUseDevMode(session?.user?.email),
  });
}
