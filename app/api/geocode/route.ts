import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseDevMode } from "@/lib/dev-mode";
import { searchPlaces } from "@/lib/geocode";

// Developer Mode place search. Gated server-side: dev env + flag + admin email.
// Nominatim policy honored here (throttle + cache in lib/geocode); the client
// additionally debounces, requires >=3 chars, and offers an explicit Search.
export async function GET(req: Request) {
  const session = await auth();
  if (!canUseDevMode(session?.user?.email)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 120) ?? "";
  if (q.trim().length < 3) {
    return NextResponse.json({ error: "Enter at least 3 characters" }, { status: 400 });
  }
  const results = await searchPlaces(q);
  return NextResponse.json({ results });
}
