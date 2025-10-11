import type { Submission } from "@prisma/client";

type GeocodeOutcome =
  | {
      status: "success";
      latitude: number;
      longitude: number;
      raw: any;
    }
  | {
      status: "no_results" | "error" | "skipped";
      raw?: any;
    };

const NOMINATIM_ENDPOINT =
  process.env.NOMINATIM_URL ??
  "https://nominatim.openstreetmap.org/search";

const USER_AGENT =
  process.env.USER_AGENT ?? "game-leadership-map/1.0 (Nominatim usage)";

export async function geocodeLocation(params: {
  institutionName?: string;
  institutionCity?: string;
  countryName?: string;
  countryCode?: string;
}): Promise<GeocodeOutcome> {
  const { institutionName, institutionCity, countryName, countryCode } =
    params;

  const parts = [
    institutionName?.trim(),
    institutionCity?.trim(),
    countryName?.trim(),
  ].filter(Boolean);

  if (!parts.length) {
    return { status: "skipped" };
  }

  const search = parts.join(", ");
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", search);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  if (countryCode) {
    url.searchParams.set("countrycodes", countryCode.toLowerCase());
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return { status: "error", raw: { status: res.status } };
    }

    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) {
      return { status: "no_results" };
    }

    const match = data[0];
    const lat = parseFloat(match.lat);
    const lon = parseFloat(match.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { status: "error", raw: match };
    }

    return {
      status: "success",
      latitude: lat,
      longitude: lon,
      raw: match,
    };
  } catch (error) {
    return { status: "error", raw: { message: (error as Error).message } };
  }
}

export function pickSubmissionCoordinates(submission: Submission) {
  const lat =
    submission.resolvedLatitude ?? submission.latitude ?? undefined;
  const lng =
    submission.resolvedLongitude ?? submission.longitude ?? undefined;
  if (!Number.isFinite(lat as number) || !Number.isFinite(lng as number)) {
    return null;
  }
  return { lat: lat as number, lng: lng as number };
}

