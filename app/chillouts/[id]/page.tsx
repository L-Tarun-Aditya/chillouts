import { redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser, initials } from "@/lib/auth";
import { getChilloutContext } from "@/lib/chillout-auth";
import { ChilloutRoom } from "@/components/chillout-room";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";

export default async function ChilloutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const chilloutId = Number(id);
  if (!Number.isInteger(chilloutId)) redirect("/");

  const chillout = await db.chillout.findUnique({
    where: { id: chilloutId },
    include: { host: true },
  });
  if (!chillout) redirect("/");

  const c = await getChilloutContext(chilloutId, user.id);
  const memberCount = await db.participation.count({ where: { chilloutId, status: "JOINED" } });
  const hereCount = memberCount + 1; // host + joined

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="w-full flex-1 flex flex-col items-center pt-8 pb-32 px-4 sm:px-6">
        <div className="w-full max-w-[480px] space-y-6">
          <section>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#fce7ed] text-[#f43f5e] font-bold text-lg flex items-center justify-center shadow-sm select-none">
                  {initials(chillout.host.name)}
                </div>
                <div className="flex flex-col">
                  <h1 className="font-condensed text-2xl uppercase font-bold text-[#111827] tracking-tight">
                    {chillout.title}
                  </h1>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                    <Crown className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.isHost ? "You're hosting" : `Hosted by ${chillout.host.name}`}</span>
                  </div>
                  {chillout.locationName && (
                    <p className="text-xs text-slate-500 mt-1">{chillout.locationName}</p>
                  )}
                  {chillout.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{chillout.description}</p>
                  )}
                </div>
              </div>
              <Badge variant={chillout.status === "ACTIVE" ? "secondary" : "outline"}>{chillout.status}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium px-0.5">
              <span>{hereCount} here</span>
              <span className="text-slate-300">•</span>
              <span>Code {chillout.inviteCode}</span>
            </div>
          </section>

          <div id="chillout-map">
            <ChilloutRoom
              chillout={{
                id: chillout.id,
                title: chillout.title,
                description: chillout.description,
                locationName: chillout.locationName,
                latitude: chillout.latitude,
                longitude: chillout.longitude,
                status: chillout.status,
                inviteCode: chillout.inviteCode,
                hostId: chillout.hostId,
              }}
              currentUserId={user.id}
              initialIsHost={c.isHost}
              myStatus={c.participation?.status ?? null}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
