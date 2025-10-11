import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT i.id, i.name, i.country, i.lat, i.lng,
           COUNT(DISTINCT a.paperId) AS paper_count
    FROM Institution i
    JOIN Authorship a ON a.institutionId = i.id
    WHERE i.lat IS NOT NULL AND i.lng IS NOT NULL
    GROUP BY i.id, i.name, i.country, i.lat, i.lng
    ORDER BY paper_count DESC
  `);

  const markers = [];
  for (const r of rows) {
    const top: any[] = await prisma.$queryRawUnsafe(`
      SELECT au.name AS name, COUNT(*) AS c
      FROM Authorship a
      JOIN Author au ON au.id = a.authorId
      WHERE a.institutionId = ?
      GROUP BY au.name
      ORDER BY c DESC
      LIMIT 5
    `, r.id);
    markers.push({
      id: r.id,
      name: r.name,
      country: r.country,
      lat: Number(r.lat),
      lng: Number(r.lng),
      paper_count: Number(r.paper_count),
      top_authors: top.map(t => t.name),
    });
  }

  return NextResponse.json(markers, { headers: { "Cache-Control": "public, max-age=300" } });
}
