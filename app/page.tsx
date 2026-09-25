import Link from "next/link";
import { ArrowRight, QrCode, Radio, ShieldCheck, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { JoinByCode } from "@/components/join-by-code";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function HomePage() {
  const user = await getCurrentUser();
  const chillouts = await db.chillout.findMany({
    orderBy: { createdAt: "desc" },
    include: { host: true, _count: { select: { participations: true } } },
    take: 12,
  });

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center px-4 max-w-6xl mx-auto w-full pt-4 pb-12">
        <section className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="font-display text-4xl sm:text-5xl md:text-[54px] text-slate-900 uppercase leading-[1.08] tracking-tight mb-5">
            Meet up. Find each other. Chill.
          </h1>
          <p className="text-slate-500 text-[15.5px] leading-relaxed max-w-xl mx-auto">
            Create a casual meetup, invite people with a QR code, and share your live location when you want everyone to know where you are.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href={user ? "/chillouts/create" : "/login"}
              className="inline-flex items-center justify-center gap-2 bg-[#ef445f] hover:bg-[#e11d48] text-white font-medium text-[14px] px-6 py-2.5 rounded-lg shadow-sm transition-all hover:shadow"
            >
              <span>Create a ChillOut</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#join" className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-800 font-medium text-[14px] px-6 py-2.5 rounded-lg border border-slate-200 shadow-sm">
              Join a ChillOut
            </a>
          </div>
          {!user && (
            <p className="mt-4 text-sm text-slate-500">
              <Link href="/login" className="text-[#ef445f] font-medium hover:underline">Sign in</Link> to create or join.
            </p>
          )}
        </section>

        <section aria-label="Feature Highlights" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-6 px-2">
          {[
            { icon: QrCode, title: "Create & Share", text: "Set up a meetup in seconds and invite people with a QR code or link." },
            { icon: Radio, title: "Live Location", text: "Share where you are with everyone — or just a few — for as long as you choose." },
            { icon: ShieldCheck, title: "You're in Control", text: "Location is never shared automatically. You decide who sees it and when it stops." },
          ].map((f) => (
            <article key={f.title} className="bg-white rounded-2xl p-7 border border-slate-200/75 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] flex flex-col items-start">
              <div className="w-10 h-10 rounded-xl bg-[#fee7ea] flex items-center justify-center mb-5 text-[#ef445f]">
                <f.icon className="w-5 h-5" />
              </div>
              <h2 className="font-display text-[15px] font-bold uppercase tracking-wider text-slate-900 mb-2">{f.title}</h2>
              <p className="text-slate-500 text-[13.5px] leading-relaxed">{f.text}</p>
            </article>
          ))}
        </section>

        <section id="join" className="w-full max-w-5xl mt-12 px-2">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display uppercase text-lg mb-2">Join with code</h2>
                <JoinByCode signedIn={!!user} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display uppercase text-lg mb-4">Recent ChillOuts</h2>
                <div className="space-y-3">
                  {chillouts.length === 0 && <p className="text-sm text-slate-500">No ChillOuts yet — create the first one.</p>}
                  {chillouts.map((c) => (
                    <Link key={c.id} href={`/chillouts/${c.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:shadow-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{c.title}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" /> {c.locationName ?? "No location"} • by {c.host.name}
                        </p>
                      </div>
                      <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status}</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <footer className="w-full text-center py-7 px-4">
        <p className="text-[12.5px] text-slate-400">ChillOuts — casual meetups, real-time coordination.</p>
      </footer>
    </div>
  );
}
