import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { isDevAdminEmail } from "@/lib/dev-mode";

const isDev = process.env.NODE_ENV === "development";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Demo picker for local multi-user testing. Never registered in production.
    ...(isDev
      ? [
          CredentialsProvider({
            credentials: { userId: { label: "User ID" } },
            async authorize(credentials) {
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
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // First call after sign-in carries user/account/profile.
      if (account?.provider === "google" && profile && profile.email) {
        const email = String(profile.email);
        const googleId = String((profile as { sub?: string }).sub ?? "");
        const dbUser = await db.user.upsert({
          where: { email },
          update: {
            googleId: googleId || undefined,
            image: typeof (profile as { picture?: string }).picture === "string"
              ? (profile as { picture?: string }).picture
              : undefined,
            name: typeof profile.name === "string" && profile.name ? profile.name : undefined,
          },
          create: {
            email,
            name: typeof profile.name === "string" && profile.name ? profile.name : email,
            googleId: googleId || undefined,
            image: typeof (profile as { picture?: string }).picture === "string"
              ? (profile as { picture?: string }).picture
              : undefined,
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
      if (typeof token.uid === "number") {
        session.user.id = String(token.uid);
      }
      (session.user as { isDevAdmin?: boolean }).isDevAdmin = token.isDevAdmin === true;
      return session;
    },
  },
};

export default NextAuth(authOptions);
