/**
 * Login Page
 *
 * A clean, minimal sign-in screen with a "Sign in with Google" button.
 * This page is publicly accessible (no auth required).
 *
 * The signIn action calls NextAuth's Google provider, which redirects
 * the user through Google's OAuth flow and back to /dashboard on success.
 */

import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-100/50 dark:bg-blue-900/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-100/50 dark:bg-indigo-900/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-auto px-6">
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center gap-8">
          {/* Logo / Brand */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-md">
              <span className="text-white dark:text-slate-900 font-bold text-2xl tracking-tight">
                N
              </span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Norman
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Internal Operations Dashboard
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full border-t border-slate-100 dark:border-slate-800" />

          {/* Sign in section */}
          <div className="w-full flex flex-col items-center gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Sign in with your company Google account to access the dashboard.
            </p>

            {/* Server Action form for NextAuth signIn */}
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
              className="w-full"
            >
              <Button
                type="submit"
                size="lg"
                className="w-full gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                variant="outline"
              >
                {/* Google "G" icon using Lucide Chrome as a stand-in */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center">
            Access is restricted to authorised team members only.
          </p>
        </div>
      </div>
    </div>
  );
}
