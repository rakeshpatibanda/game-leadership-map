import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkSubmitterSearchRateLimit,
  logSubmitterSearchRequest,
} from "@/lib/rate-limit";
import { getRequestIp, getUserAgent } from "@/lib/request";

const DEFAULT_LIMIT = parseInt(
  process.env.SUBMITTER_SEARCH_RESULT_LIMIT ??
    process.env.INSTITUTION_SEARCH_RESULT_LIMIT ??
    "10",
  10,
);

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getUserAgent(req);

  const url = req.nextUrl;
  const q = (url.searchParams.get("q") ?? "").trim();
  const limitParam = url.searchParams.get("limit");

  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  const limit = Math.min(
    Math.max(Number(limitParam) || DEFAULT_LIMIT, 1),
    25,
  );

  const rate = await checkSubmitterSearchRateLimit(ip);
  if (!rate.allowed) {
    await logSubmitterSearchRequest({
      ip,
      userAgent,
      success: false,
      error: "rate_limited",
    });
    return NextResponse.json(
      { error: "Too many searches. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfter) },
      },
    );
  }

  try {
    const submissionRows = await prisma.submission.findMany({
      where: {
        contactName: {
          contains: q,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit * 3,
      select: {
        contactName: true,
        contactEmail: true,
      },
    });

    const authorRows = await prisma.author.findMany({
      where: {
        name: {
          contains: q,
        },
      },
      orderBy: [{ name: "asc" }],
      take: limit * 3,
      select: {
        name: true,
      },
    });

    await logSubmitterSearchRequest({
      ip,
      userAgent,
      success: true,
    });

    const seen = new Set<string>();
    const suggestions: Array<{
      name: string;
      email: string | null;
      source: "submission" | "author";
    }> = [];

    for (const row of submissionRows) {
      const name = (row.contactName ?? "").trim();
      if (!name) continue;
      const key = `${name.toLowerCase()}|${(row.contactEmail ?? "")
        .trim()
        .toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        name,
        email: (row.contactEmail ?? "").trim() || null,
        source: "submission",
      });
      if (suggestions.length >= limit) break;
    }

    if (suggestions.length < limit) {
      for (const row of authorRows) {
        const name = (row.name ?? "").trim();
        if (!name) continue;
        const key = `${name.toLowerCase()}|`; // authors have no email
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push({
          name,
          email: null,
          source: "author",
        });
        if (suggestions.length >= limit) break;
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Submitter search failed:", error);
    await logSubmitterSearchRequest({
      ip,
      userAgent,
      success: false,
      error: "search_failed",
    });
    return NextResponse.json(
      { error: "Unable to search submitters right now." },
      { status: 500 },
    );
  }
}
