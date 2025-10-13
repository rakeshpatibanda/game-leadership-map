import type { NextRequest } from "next/server";

function extractHeaders(req: NextRequest | Request): Headers {
  if (req instanceof Request) return req.headers;
  // NextRequest always provides a Headers object
  return (req as NextRequest).headers ?? new Headers();
}

export function getRequestIp(req: NextRequest | Request): string {
  const headers = extractHeaders(req);

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  // NextRequest exposes `ip`; fall back gracefully if absent
  const maybeIp = (req as any).ip;
  if (typeof maybeIp === "string" && maybeIp) {
    return maybeIp;
  }

  return headers.get("x-real-ip") ?? "0.0.0.0";
}

export function getUserAgent(req: NextRequest | Request) {
  const headers = extractHeaders(req);
  return headers.get("user-agent") ?? "unknown";
}
