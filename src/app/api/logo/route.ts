import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { buffer: ArrayBuffer; contentType: string; timestamp: number; success: boolean }>();
const CACHE_TTL_SUCCESS = 1000 * 60 * 60 * 24 * 7; // 7 days for successes
const CACHE_TTL_FAILURE = 1000 * 60 * 60 * 6; // 6 hours for failures

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.toLowerCase().trim();
  if (!domain) return new NextResponse("Missing domain", { status: 400 });

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  const cached = cache.get(cleanDomain);
  if (cached) {
    const ttl = cached.success ? CACHE_TTL_SUCCESS : CACHE_TTL_FAILURE;
    if (Date.now() - cached.timestamp < ttl) {
      if (cached.success) {
        return new NextResponse(cached.buffer, {
          headers: { "Content-Type": cached.contentType, "Cache-Control": "public, max-age=604800" },
        });
      }
      return new NextResponse(null, { status: 404 });
    }
  }

  const sources = [
    // Google gstatic — most reliable, returns real brand PNGs for most domains
    `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanDomain}&size=128`,
    // Brandfetch CDN — high quality if accessible (requires key in some environments)
    `https://cdn.brandfetch.io/${cleanDomain}/w/400/h/400`,
    `https://cdn.brandfetch.io/${cleanDomain}`,
    // Clearbit — works in some environments
    `https://logo.clearbit.com/${cleanDomain}?size=200`,
    // DuckDuckGo — always works, small favicon
    `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`,
    // Google favicon — fallback
    `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`,
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Norman-Dashboard)", "Accept": "image/*" },
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 100) continue; // skip empty/placeholder responses

      cache.set(cleanDomain, { buffer, contentType, timestamp: Date.now(), success: true });
      return new NextResponse(buffer, {
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=604800" },
      });
    } catch {
      continue;
    }
  }

  cache.set(cleanDomain, { buffer: new ArrayBuffer(0), contentType: "", timestamp: Date.now(), success: false });
  return new NextResponse(null, { status: 404 });
}
