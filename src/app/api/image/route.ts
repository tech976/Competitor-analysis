import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy for hotlink-protected Meta/Instagram CDN media (the same trick the
 * reference project used). The browser can't load fbcdn/cdninstagram URLs
 * directly, so the dashboard requests them through here.
 *
 * Restricted to known Meta CDN hosts so this isn't an open proxy.
 */
const ALLOWED = ["fbcdn.net", "cdninstagram.com", "facebook.com"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  let host: string;
  try {
    host = new URL(target).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }
  if (!ALLOWED.some((d) => host === d || host.endsWith(`.${d}`))) {
    return NextResponse.json({ error: "Host not allowed." }, { status: 403 });
  }

  const upstream = await fetch(target, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream error ${upstream.status}.` },
      { status: 502 }
    );
  }

  return new NextResponse(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=86400",
    },
  });
}
