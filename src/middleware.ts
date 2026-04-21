export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/xero/auth|api/xero/callback|api/monday|api/crm|api/send-prospecting|api/send-prospecting-personal|api/screenshots|share).*)",
  ],
};
