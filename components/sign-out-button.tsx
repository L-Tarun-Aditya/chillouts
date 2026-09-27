"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      className="inline-flex items-center gap-2 font-medium text-slate-800 hover:text-[#ef445f] transition-colors"
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
    >
      <LogOut className="w-4 h-4" />
      <span>Sign out</span>
    </button>
  );
}
