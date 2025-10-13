import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type MarkerRow = {
  id: string;
  name: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  paper_count: number;
  top_authors: string[];
};

export async function GET() {
  const rows = await prisma.$queryRaw<MarkerRow[]>(Prisma.sql`
    WITH marker_counts AS (
      SELECT
        i.id,
        i.name,
        i.country,
        i.lat,
        i.lng,
        COUNT(DISTINCT a."paperId")::INTEGER AS paper_count
      FROM "Institution" i
      INNER JOIN "Authorship" a ON a."institutionId" = i.id
      WHERE i.lat IS NOT NULL
        AND i.lng IS NOT NULL
      GROUP BY i.id, i.name, i.country, i.lat, i.lng
    ),
    ranked_authors AS (
      SELECT
        a."institutionId",
        au.name,
        ROW_NUMBER() OVER (
          PARTITION BY a."institutionId"
          ORDER BY COUNT(*) DESC, au.name
        ) AS rn
      FROM "Authorship" a
      INNER JOIN "Author" au ON au.id = a."authorId"
      GROUP BY a."institutionId", au.name
    )
    SELECT
      mc.id,
      mc.name,
      mc.country,
      mc.lat,
      mc.lng,
      mc.paper_count,
      COALESCE(
        ARRAY(
          SELECT ra.name
          FROM ranked_authors ra
          WHERE ra."institutionId" = mc.id
            AND ra.rn <= 5
            AND ra.name IS NOT NULL
          ORDER BY ra.rn
        ),
        '{}'
      ) AS top_authors
    FROM marker_counts mc
    ORDER BY mc.paper_count DESC;
  `);

  const markers = rows.map((r) => ({
    id: r.id,
    name: r.name ?? undefined,
    country: r.country ?? undefined,
    lat: r.lat === null ? null : Number(r.lat),
    lng: r.lng === null ? null : Number(r.lng),
    paper_count: Number(r.paper_count),
    top_authors: r.top_authors ?? [],
  }));

  return NextResponse.json(markers, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
