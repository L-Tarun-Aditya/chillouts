import Link from "next/link";
import { MapPin, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="w-full px-8 lg:px-14 py-6 flex items-center justify-between" data-purpose="site-navigation-bar">
      <Link href="/" aria-label="ChillOuts Home" className="flex items-center gap-2.5 hover:opacity-90">
        <div className="w-8 h-8 rounded-full bg-[#ef445f] flex items-center justify-center text-white shadow-sm">
          <MapPin className="w-4 h-4" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900">ChillOuts</span>
      </Link>
      <div className="flex items-center gap-4 text-[14px]">
        {user ? (
          <>
            <span className="text-slate-500">
              Signed in as <strong className="font-semibold text-slate-800">{user.name}</strong>
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="inline-flex items-center gap-2 font-medium text-slate-800 hover:text-brand-primary transition-colors" type="submit">
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="font-medium text-slate-800 hover:text-[#ef445f]">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
