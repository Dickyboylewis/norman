/**
 * Root page — redirects to /dashboard
 *
 * The middleware will handle auth: if not logged in, it redirects to /login.
 * If logged in, the user lands on /dashboard.
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
