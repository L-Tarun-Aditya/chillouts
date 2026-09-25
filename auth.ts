import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { isDevAdminEmail } from "@/lib/dev-mode";

const isDev = process.env.NODE_ENV === "development";
const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    ...(googleConfigured ? [Google] : []),
    // Demo picker for local multi-user testing. Never registered in production.
    ...(isDev
      ? [
          Credentials({
            credentials: { userId: { label: "User ID" } },
            authorize: async (credentials) => {
              if (process.env.NODE_ENV !== "development") return null;
              const id = Number(credentials?.userId);
              if (!Number.isInteger(id)) return null;
              const user = await db.user.findUnique({ where: { id } });
              if (!user) return null;
              return { id: String(user.id), email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // First call after sign-in carries user/account/profile.
      if (account?.provider === "google" && profile && "email" in profile && profile.email) {
        const email = String(profile.email);
        const googleId = String(profile.sub ?? "");
        const dbUser = await db.user.upsert({
          where: { email },
          update: {
            googleId: googleId || undefined,
            image: typeof profile.picture === "string" ? profile.picture : undefined,
            name: typeof profile.name === "string" && profile.name ? profile.name : undefined,
          },
          create: {
            email,
            name: typeof profile.name === "string" && profile.name ? profile.name : email,
            googleId: googleId || undefined,
            image: typeof profile.picture === "string" ? profile.picture : undefined,
          },
        });
        token.uid = dbUser.id;
        token.isDevAdmin = isDevAdminEmail(email);
        return token;
      }
      if (user?.id) {
        const id = Number(user.id);
        if (Number.isInteger(id)) {
          token.uid = id;
          token.isDevAdmin = isDevAdminEmail(user.email ?? undefined);
        }
        return token;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.uid === "number") session.user.id = String(token.uid);
      session.user.isDevAdmin = token.isDevAdmin === true;
      return session;
    },
  },
});
