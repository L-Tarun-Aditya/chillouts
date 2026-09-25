import { db } from "@/lib/db";

/** Strict id parsing: rejects NaN, floats, negatives — prevents Prisma 500s. */
export function parseChilloutId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function getChilloutContext(chilloutId: number, userId: number) {
  const chillout = await db.chillout.findUnique({
    where: { id: chilloutId },
    include: { host: true },
  });
  if (!chillout) return { chillout: null as null, isHost: false, participation: null, isBlocked: false, isMember: false };
  const isHost = chillout.hostId === userId;
  const participation = await db.participation.findUnique({
    where: { chilloutId_userId: { chilloutId, userId } },
  });
  const isBlocked = participation?.status === "BLOCKED";
  const isMember = isHost || participation?.status === "JOINED";
  return { chillout, isHost, participation, isBlocked, isMember };
}
