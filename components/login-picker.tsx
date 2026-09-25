"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type User = { id: number; name: string; email: string };

/** Development-only demo picker (Credentials provider is registered in dev only). */
export function LoginPicker({ users }: { users: User[] }) {
  const [loading, setLoading] = useState<number | null>(null);

  async function signInAs(id: number) {
    setLoading(id);
    await signIn("credentials", { userId: String(id), callbackUrl: "/" });
    setLoading(null);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display uppercase tracking-wide">Pick a demo user</CardTitle>
        <p className="text-sm text-slate-500">
          Local development only. Production uses Google sign-in.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.map((u) => (
          <Button
            key={u.id}
            variant="outline"
            className="w-full justify-start"
            disabled={loading !== null}
            onClick={() => signInAs(u.id)}
          >
            {loading === u.id ? "Signing in..." : `${u.name} — ${u.email}`}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
