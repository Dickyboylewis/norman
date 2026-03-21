import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/xero";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "No authorisation code provided by Xero." },
      { status: 400 }
    );
  }

  const redirectUri = process.env.XERO_REDIRECT_URI!;

  try {
    await exchangeCodeForTokens(code, redirectUri);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Xero Callback Error:", error);
    return NextResponse.json(
      { error: "Failed to exchange Xero authorisation code." },
      { status: 500 }
    );
  }
}