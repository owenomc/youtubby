// auth.ts (project root, or src/auth.ts)
import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Cognito],
  callbacks: {
    // Expose the Cognito user id (sub) on the session
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});