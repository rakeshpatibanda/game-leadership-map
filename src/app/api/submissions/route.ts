import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeLocation } from "@/lib/geocode";
import { getRequestIp, getUserAgent } from "@/lib/request";
import {
  checkSubmissionRateLimit,
  logSubmissionRequest,
} from "@/lib/rate-limit";

type SubmissionPayload = {
  contactName?: string;
  contactEmail?: string;
  submitterType?: string;
  institutionName?: string;
  institutionCountry?: string;
  institutionCountryName?: string;
  institutionCity?: string;
  institutionWebsite?: string;
  leadershipApproach?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  institutionId?: string;
  duplicateOfId?: string;
};

const MAX_TEXT_LENGTH = 800;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const urlRegex =
  /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;

const normaliseNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const userAgent = getUserAgent(req);

  let body: SubmissionPayload;
  try {
    body = await req.json();
  } catch {
    await logSubmissionRequest({
      ip,
      userAgent,
      success: false,
      error: "invalid_json",
    });
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const rateCheck = await checkSubmissionRateLimit(ip);
  if (!rateCheck.allowed) {
    await logSubmissionRequest({
      ip,
      userAgent,
      success: false,
      error: "rate_limited",
    });
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateCheck.retryAfter),
        },
      },
    );
  }

  const errors: string[] = [];

  const contactName = (body.contactName ?? "").trim();
  if (!contactName) {
    errors.push("contactName is required.");
  } else if (contactName.length > 120) {
    errors.push("contactName must be 120 characters or fewer.");
  }

  const contactEmail = (body.contactEmail ?? "").trim();
  if (contactEmail && !emailRegex.test(contactEmail)) {
    errors.push("contactEmail must be a valid email address.");
  }

  const institutionName = (body.institutionName ?? "").trim();
  if (!institutionName) {
    errors.push("institutionName is required.");
  } else if (institutionName.length > 160) {
    errors.push("institutionName must be 160 characters or fewer.");
  }

  const institutionCountryName = (body.institutionCountryName ?? "").trim();

  let institutionCountry: string | null = (body.institutionCountry ?? "")
    .trim();
  if (institutionCountry) {
    if (institutionCountry.length !== 2) {
      errors.push("institutionCountry must be a two-letter country code.");
    } else {
      institutionCountry = institutionCountry.toUpperCase();
    }
  } else {
    institutionCountry = null;
  }

  const institutionCity = (body.institutionCity ?? "").trim();

  const institutionWebsite = (body.institutionWebsite ?? "").trim();
  if (institutionWebsite && !urlRegex.test(institutionWebsite)) {
    errors.push("institutionWebsite must be a valid URL.");
  }

  const submitterType = (body.submitterType ?? "").trim();

  const leadershipApproach = (body.leadershipApproach ?? "").trim();
  if (!leadershipApproach) {
    errors.push("leadershipApproach is required.");
  } else if (leadershipApproach.length > MAX_TEXT_LENGTH) {
    errors.push(
      `leadershipApproach must be ${MAX_TEXT_LENGTH} characters or fewer.`,
    );
  }

  const institutionId = (body.institutionId ?? "").trim();
  const duplicateOfId = (body.duplicateOfId ?? "").trim();

  let linkedInstitution: { id: string; name: string | null; country: string | null; lat: number | null; lng: number | null } | null =
    null;
  let duplicateInstitution: { id: string } | null = null;

  if (institutionId) {
    linkedInstitution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, name: true, country: true, lat: true, lng: true },
    });
    if (!linkedInstitution) {
      errors.push("institutionId does not match an existing institution.");
    }
    if (!institutionCountry && linkedInstitution?.country) {
      institutionCountry = linkedInstitution.country ?? null;
    }
  }

  if (duplicateOfId) {
    duplicateInstitution = await prisma.institution.findUnique({
      where: { id: duplicateOfId },
      select: { id: true },
    });
    if (!duplicateInstitution) {
      errors.push("duplicateOfId does not match an existing institution.");
    }
  }

  const latitude = normaliseNumber(body.latitude);
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    errors.push("latitude must be between -90 and 90.");
  }

  const longitude = normaliseNumber(body.longitude);
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    errors.push("longitude must be between -180 and 180.");
  }

  if (errors.length > 0) {
    await logSubmissionRequest({
      ip,
      userAgent,
      success: false,
      error: "validation_failed",
    });
    return NextResponse.json({ errors }, { status: 422 });
  }

  let geocodeStatus = "skipped";
  let geocodeResponse: any = null;
  let resolvedLatitude: number | null = null;
  let resolvedLongitude: number | null = null;

  if (
    linkedInstitution &&
    linkedInstitution.lat !== null &&
    linkedInstitution.lat !== undefined &&
    linkedInstitution.lng !== null &&
    linkedInstitution.lng !== undefined
  ) {
    geocodeStatus = "linked";
    resolvedLatitude = linkedInstitution.lat;
    resolvedLongitude = linkedInstitution.lng;
    geocodeResponse = { source: "institution" };
  } else {
    const geocode = await geocodeLocation({
      institutionName,
      institutionCity,
      countryName: institutionCountryName,
      countryCode: institutionCountry ?? undefined,
    });
    geocodeStatus = geocode.status;
    geocodeResponse = geocode.raw ?? null;
    if (geocode.status === "success") {
      resolvedLatitude = geocode.latitude;
      resolvedLongitude = geocode.longitude;
    }
  }

  if (resolvedLatitude === null && latitude !== null) {
    resolvedLatitude = latitude;
  }
  if (resolvedLongitude === null && longitude !== null) {
    resolvedLongitude = longitude;
  }
  if (
    geocodeStatus === "skipped" &&
    resolvedLatitude !== null &&
    resolvedLongitude !== null
  ) {
    geocodeStatus = "manual";
  }

  const locationQuery = [institutionCity, institutionCountryName]
    .filter(Boolean)
    .join(", ");

  try {
    const submission = await prisma.submission.create({
      data: {
        contactName,
        contactEmail: contactEmail || null,
        institutionName,
        institutionCountry: institutionCountry ?? null,
        institutionCountryName: institutionCountryName || null,
        institutionCity: institutionCity || null,
        locationQuery: locationQuery || null,
        institutionWebsite: institutionWebsite || null,
        leadershipApproach,
        latitude,
        longitude,
        resolvedLatitude,
        resolvedLongitude,
        geocodeStatus,
        geocodeResponse,
        submissionIp: ip,
        submitterType: submitterType || null,
        institutionId: linkedInstitution?.id ?? null,
        duplicateOfId: duplicateInstitution?.id ?? null,
      },
      select: { id: true },
    });

    await logSubmissionRequest({
      ip,
      userAgent,
      success: true,
    });

    return NextResponse.json(
      {
        message:
          "Thank you! Your leadership approach has been recorded and is awaiting review.",
        submissionId: submission.id,
        geocodeStatus,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to save submission", error);
    await logSubmissionRequest({
      ip,
      userAgent,
      success: false,
      error: "save_failed",
    });
    return NextResponse.json(
      { error: "Unable to store submission at this time." },
      { status: 500 },
    );
  }
}
