import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickSubmissionCoordinates } from "@/lib/geocode";

type CommunityLeader = {
  id: string;
  name: string;
  leadership: string;
  website?: string | null;
  submittedAt: string;
};

type CommunityMarker = {
  id: string;
  name: string;
  country?: string | null;
  countryName?: string | null;
  lat: number;
  lng: number;
  status: string;
  geocodeStatus: string;
  leaders: CommunityLeader[];
};

export async function GET() {
  const submissions = await prisma.submission.findMany({
    where: {
      status: "approved",
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      institution: {
        select: {
          id: true,
          name: true,
          country: true,
          lat: true,
          lng: true,
        },
      },
    },
  });

  const grouped = new Map<string, CommunityMarker>();

  for (const submission of submissions) {
    let coords = pickSubmissionCoordinates(submission);
    if (
      !coords &&
      submission.institution &&
      submission.institution.lat !== null &&
      submission.institution.lat !== undefined &&
      submission.institution.lng !== null &&
      submission.institution.lng !== undefined
    ) {
      coords = {
        lat: submission.institution.lat,
        lng: submission.institution.lng,
      };
    }
    if (!coords) continue;

    const key =
      submission.institutionId ||
      submission.institution?.id ||
      submission.institutionName ||
      submission.id;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        name: submission.institution?.name ?? submission.institutionName,
        country:
          submission.institutionCountry ??
          submission.institution?.country ??
          null,
        countryName: submission.institutionCountryName,
        lat: coords.lat,
        lng: coords.lng,
        status: submission.status,
        geocodeStatus: submission.geocodeStatus,
        leaders: [],
      });
    }

    const group = grouped.get(key)!;
    group.leaders.push({
      id: submission.id,
      name: submission.contactName,
      leadership: submission.leadershipApproach,
      website: submission.institutionWebsite,
      submittedAt: submission.createdAt.toISOString(),
    });
  }

  const markers = Array.from(grouped.values());

  return NextResponse.json(markers, {
    headers: {
      "Cache-Control": "public, max-age=120",
    },
  });
}
