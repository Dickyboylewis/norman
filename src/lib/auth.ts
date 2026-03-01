/**
 * NextAuth.js (Auth.js v5) Configuration
 *
 * This file sets up authentication with Google SSO.
 *
 * REQUIRED ENVIRONMENT VARIABLES (add to .env.local):
 *   AUTH_SECRET          - A random secret string (run: openssl rand -base64 32)
 *   AUTH_GOOGLE_ID       - Your Google OAuth Client ID
 *   AUTH_GOOGLE_SECRET   - Your Google OAuth Client Secret
 *
 * To get Google OAuth credentials:
 *   1. Go to https://console.cloud.google.com/
 *   2. Create a new project (or select existing)
 *   3. Navigate to APIs & Services > Credentials
 *   4. Create OAuth 2.0 Client ID (Web application)
 *   5. Add Authorized redirect URI: http://localhost:3000/api/auth/callback/google
 *   6. Copy the Client ID and Client Secret into your .env.local
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // These are automatically read from AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
      // environment variables — no need to pass them explicitly.
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],

  // Custom pages
  pages: {
    signIn: "/login",
  },

  callbacks: {
    /**
     * The `authorized` callback is used by the middleware to check if a user
     * is allowed to access a route. Return true to allow, false to deny.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        // Redirect logged-in users away from the login page
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },

    /**
     * The `session` callback is called whenever a session is checked.
     * We expose the user's ID on the session object here.
     */
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },

  // Using JWT strategy (no database required for this setup)
  session: {
    strategy: "jwt",
  },
});
