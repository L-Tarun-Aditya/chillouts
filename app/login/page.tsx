import { db } from "@/lib/db";
import { LoginPicker } from "@/components/login-picker";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { SiteHeader } from "@/components/site-header";

const isDev = process.env.NODE_ENV === "development";
const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export default async function LoginPage() {
  const users = isDev ? await db.user.findMany({ orderBy: { id: "asc" } }) : [];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {googleConfigured ? (
          <GoogleSignInButton />
        ) : (
          !isDev && (
            <p className="text-sm text-slate-500 max-w-md text-center">
              Sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
            </p>
          )
        )}
        {isDev && (
          <LoginPicker users={users.map((u) => ({ id: u.id, name: u.name, email: u.email }))} />
        )}
      </main>
    </div>
  );
}
