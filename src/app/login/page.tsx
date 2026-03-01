/**
 * Login Page
 *
 * A clean sign-in screen styled with White Red branding.
 * Primary red (#DA2C26) with Poppins/Roboto typography.
 */

import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      {/* Subtle red background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full bg-[#DA2C26]/5 blur-3xl" />
        <div className="absolute -bottom-60 -left-60 w-[600px] h-[600px] rounded-full bg-[#DA2C26]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-auto px-6">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-10 flex flex-col items-center gap-8">

          {/* Logo / Brand */}
          <div className="flex flex-col items-center gap-4">
            {/* White Red style logo mark — bold red square with "N" */}
            <div className="w-16 h-16 rounded-lg bg-[#DA2C26] flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-3xl tracking-tight">
                N
              </span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[#333333] tracking-tight">
                Norman
              </h1>
              <p className="text-sm text-[#7A7A7A] mt-1">
                Internal Operations Dashboard
              </p>
            </div>
          </div>

          {/* Red accent divider */}
          <div className="w-12 h-0.5 bg-[#DA2C26] rounded-full" />

          {/* Sign in section */}
          <div className="w-full flex flex-col items-center gap-4">
            <p className="text-sm text-[#54595F] text-center">
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
                className="w-full gap-3 bg-white hover:bg-gray-50 text-[#54595F] border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#DA2C26]/30"
                variant="outline"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 flex-shrink-0"
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

            {/* Alternative: sign in with red primary button style */}
            <p className="text-xs text-[#7A7A7A] text-center">
              Access is restricted to authorised team members only.
            </p>
          </div>
        </div>

        {/* White Red branding footer */}
        <p className="text-center text-xs text-[#7A7A7A] mt-6">
          Powered by{" "}
          <a
            href="https://whitered.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#DA2C26] hover:underline font-medium"
          >
            White Red
          </a>
        </p>
      </div>
    </div>
  );
}
