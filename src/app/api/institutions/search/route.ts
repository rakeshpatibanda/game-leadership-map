import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkInstitutionSearchRateLimit,
  logInstitutionSearchRequest,
} from "@/lib/rate-limit";
import { getRequestIp, getUserAgent } from "@/lib/request";

const DEFAULT_LIMIT = parseInt(
  process.env.INSTITUTION_SEARCH_RESULT_LIMIT ?? "10",
  10,
);

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getUserAgent(req);

  const url = req.nextUrl;
  const q = (url.searchParams.get("q") ?? "").trim();
  const limitParam = url.searchParams.get("limit");
  const country = (url.searchParams.get("country") ?? "")
    .trim()
    .toUpperCase();

  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  const limit = Math.min(
    Math.max(Number(limitParam) || DEFAULT_LIMIT, 1),
    25,
  );

  const rate = await checkInstitutionSearchRateLimit(ip);
  if (!rate.allowed) {
    await logInstitutionSearchRequest({
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
    const where: any = {
      name: { contains: q },
    };
    if (country && country.length === 2) {
      where.country = country;
    }

    const rows = await prisma.institution.findMany({
      where,
      orderBy: [{ name: "asc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        country: true,
        lat: true,
        lng: true,
        _count: {
          select: {
            authorships: true,
          },
        },
      },
    });

    await logInstitutionSearchRequest({
      ip,
      userAgent,
      success: true,
    });

    const suggestions = rows.map((row) => ({
      id: row.id,
      name: row.name,
      country: row.country,
      lat: row.lat,
      lng: row.lng,
      paperCount: row._count.authorships,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Institution search failed:", error);
    await logInstitutionSearchRequest({
      ip,
      userAgent,
      success: false,
      error: "search_failed",
    });
    return NextResponse.json(
      { error: "Unable to search institutions right now." },
      { status: 500 },
    );
  }
}
