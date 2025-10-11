import type { NextRequest } from "next/server";

export function getRequestIp(req: NextRequest | Request) {
  if (req instanceof Request) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const ip = forwarded.split(",")[0]?.trim();
      if (ip) return ip;
    }
    return req.headers.get("x-real-ip") ?? "0.0.0.0";
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return req.ip ?? req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export function getUserAgent(req: NextRequest | Request) {
  return req.headers.get("user-agent") ?? "unknown";
}

