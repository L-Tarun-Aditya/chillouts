"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function JoinByCode({ signedIn }: { signedIn: boolean }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!signedIn) {
      router.push("/login");
      return;
    }
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Enter an invite code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/chillouts/by-code/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Not found");
        return;
      }
      router.push(`/chillouts/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input placeholder="e.g. EVEN2026" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Invite code" />
      <Button type="submit" disabled={loading}>{loading ? "Finding..." : "Join"}</Button>
      {error && <p className="text-sm text-red-600 w-full pt-2">{error}</p>}
    </form>
  );
}
