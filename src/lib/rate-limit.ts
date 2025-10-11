import { prisma } from "@/lib/prisma";

const SUBMISSION_WINDOW_MINUTES = parseInt(
  process.env.SUBMISSION_RATE_LIMIT_WINDOW ?? "60",
  10,
);
const SUBMISSION_MAX_REQUESTS = parseInt(
  process.env.SUBMISSION_RATE_LIMIT_MAX ?? "5",
  10,
);

const SEARCH_WINDOW_MINUTES = parseInt(
  process.env.SEARCH_RATE_LIMIT_WINDOW ?? "10",
  10,
);
const SEARCH_MAX_REQUESTS = parseInt(
  process.env.SEARCH_RATE_LIMIT_MAX ?? "40",
  10,
);

const SUBMITTER_SEARCH_WINDOW_MINUTES = parseInt(
  process.env.SUBMITTER_SEARCH_RATE_LIMIT_WINDOW ??
    process.env.SEARCH_RATE_LIMIT_WINDOW ??
    "10",
  10,
);
const SUBMITTER_SEARCH_MAX_REQUESTS = parseInt(
  process.env.SUBMITTER_SEARCH_RATE_LIMIT_MAX ??
    process.env.SEARCH_RATE_LIMIT_MAX ??
    "40",
  10,
);

async function checkRateLimit(params: {
  ip: string;
  type: string;
  windowMinutes: number;
  maxRequests: number;
}): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const { ip, type, windowMinutes, maxRequests } = params;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const recent = await prisma.submissionRequest.count({
    where: {
      ip,
      type,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (recent >= maxRequests) {
    return { allowed: false, retryAfter: windowMinutes * 60 };
  }

  return { allowed: true };
}

export async function checkSubmissionRateLimit(
  ip: string,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  return checkRateLimit({
    ip,
    type: "submission",
    windowMinutes: SUBMISSION_WINDOW_MINUTES,
    maxRequests: SUBMISSION_MAX_REQUESTS,
  });
}

export async function checkInstitutionSearchRateLimit(
  ip: string,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  return checkRateLimit({
    ip,
    type: "institution-search",
    windowMinutes: SEARCH_WINDOW_MINUTES,
    maxRequests: SEARCH_MAX_REQUESTS,
  });
}

export async function checkSubmitterSearchRateLimit(
  ip: string,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  return checkRateLimit({
    ip,
    type: "submitter-search",
    windowMinutes: SUBMITTER_SEARCH_WINDOW_MINUTES,
    maxRequests: SUBMITTER_SEARCH_MAX_REQUESTS,
  });
}

type LogParams = {
  ip: string;
  userAgent?: string | null;
  success: boolean;
  error?: string | null;
  type: string;
};

async function logRequest({
  ip,
  userAgent,
  success,
  error,
  type,
}: LogParams) {
  await prisma.submissionRequest.create({
    data: {
      ip,
      userAgent: userAgent ?? null,
      success,
      error: error ?? null,
      type,
    },
  });
}

export async function logSubmissionRequest(params: {
  ip: string;
  userAgent?: string | null;
  success: boolean;
  error?: string | null;
}) {
  await logRequest({ ...params, type: "submission" });
}

export async function logInstitutionSearchRequest(params: {
  ip: string;
  userAgent?: string | null;
  success: boolean;
  error?: string | null;
}) {
  await logRequest({ ...params, type: "institution-search" });
}

export async function logSubmitterSearchRequest(params: {
  ip: string;
  userAgent?: string | null;
  success: boolean;
  error?: string | null;
}) {
  await logRequest({ ...params, type: "submitter-search" });
}
