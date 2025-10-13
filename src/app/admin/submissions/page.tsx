import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteSubmissionButton } from "./DeleteSubmissionButton";

const formatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

async function getAdminIdentity() {
  const headerList = await headers();
  const auth = headerList.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    const [user] = decoded.split(":");
    if (user) return user;
  }
  return process.env.ADMIN_USER ?? "admin";
}

async function updateSubmissionStatus(formData: FormData) {
  "use server";

  const submissionId = formData.get("submissionId")?.toString();
  const action = formData.get("actionType")?.toString();
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!submissionId || !action) {
    throw new Error("Missing submission ID or action type");
  }

  const reviewer = await getAdminIdentity();
  const now = new Date();

  if (action === "approve") {
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "approved",
        approvedBy: reviewer,
        approvedAt: now,
        reviewedAt: now,
        rejectionReason: null,
        rejectedAt: null,
      },
    });
  } else if (action === "reject") {
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "rejected",
        rejectionReason: notes,
        rejectedAt: now,
        reviewedAt: now,
        approvedBy: null,
        approvedAt: null,
      },
    });
  } else if (action === "reset") {
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "pending",
        approvedBy: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        reviewedAt: null,
      },
    });
  } else {
    throw new Error("Unknown action");
  }

  revalidatePath("/admin/submissions");
}

async function updateSubmissionLink(formData: FormData) {
  "use server";

  const submissionId = formData.get("submissionId")?.toString();
  const mode = formData.get("mode")?.toString();
  const action = formData.get("action")?.toString();
  const value = formData.get("value")?.toString().trim() ?? "";

  if (!submissionId || !mode || !action) {
    throw new Error("Missing submission ID, mode, or action");
  }

  if (mode === "institution") {
    if (action === "assign") {
      if (!value) throw new Error("Institution ID is required to link");
      const institution = await prisma.institution.findUnique({
        where: { id: value },
        select: { id: true },
      });
      if (!institution) {
        throw new Error(`Institution ${value} not found`);
      }
      await prisma.submission.update({
        where: { id: submissionId },
        data: { institutionId: institution.id },
      });
    } else if (action === "clear") {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { institutionId: null },
      });
    } else {
      throw new Error("Unknown action for institution link");
    }
  } else if (mode === "duplicate") {
    if (action === "assign") {
      if (!value) throw new Error("Duplicate institution ID is required");
      const duplicate = await prisma.institution.findUnique({
        where: { id: value },
        select: { id: true },
      });
      if (!duplicate) {
        throw new Error(`Institution ${value} not found`);
      }
      await prisma.submission.update({
        where: { id: submissionId },
        data: { duplicateOfId: duplicate.id },
      });
    } else if (action === "clear") {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { duplicateOfId: null },
      });
    } else {
      throw new Error("Unknown action for duplicate link");
    }
  } else {
    throw new Error("Unknown mode");
  }

  revalidatePath("/admin/submissions");
}

export async function deleteSubmissionAction(submissionId: string) {
  "use server";

  if (!submissionId) throw new Error("Missing submission ID");
  await prisma.submission.delete({ where: { id: submissionId } });
  revalidatePath("/admin/submissions");
}

export default async function AdminSubmissionsPage() {
  const [pending, approved, rejected] = await Promise.all([
    prisma.submission.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        institution: {
          select: { id: true, name: true, country: true, lat: true, lng: true },
        },
        duplicateOf: {
          select: { id: true, name: true, country: true },
        },
      },
    }),
    prisma.submission.findMany({
      where: { status: "approved" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        institution: {
          select: { id: true, name: true, country: true },
        },
        duplicateOf: {
          select: { id: true, name: true, country: true },
        },
      },
    }),
    prisma.submission.findMany({
      where: { status: "rejected" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        institution: {
          select: { id: true, name: true, country: true },
        },
        duplicateOf: {
          select: { id: true, name: true, country: true },
        },
      },
    }),
  ]);

  const reviewer = await getAdminIdentity();

  return (
    <main className="min-h-screen bg-slate-100 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-6">
        <header className="mb-8 flex flex-col gap-2">
          <Link
            href="/"
            className="w-fit text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Back to map
          </Link>
          <h1 className="text-3xl font-semibold text-slate-900">
            Submission Review
          </h1>
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-medium">{reviewer}</span>.
            Approve to publish on the community layer or reject with notes.
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Pending ({pending.length})
            </h2>
            <span className="text-xs text-slate-500">
              Auto-geocoded via Nominatim – review accuracy before approval.
            </span>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-600">
              Nothing waiting for review.
            </p>
          ) : (
            <div className="grid gap-5">
              {pending.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {submission.institutionName}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {submission.institutionCity
                          ? `${submission.institutionCity}, `
                          : ""}
                        {submission.institutionCountryName ??
                          submission.institutionCountry ??
                          "Unknown country"}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Submitted {formatter.format(submission.createdAt)}
                    </div>
                  </div>

                  <dl className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <div>
                      <dt className="font-medium text-slate-900">
                        Contact
                      </dt>
                      <dd>
                        {submission.contactName}
                        {submission.contactEmail
                          ? ` · ${submission.contactEmail}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">
                        Website
                      </dt>
                      <dd>
                        {submission.institutionWebsite ? (
                          <a
                            href={submission.institutionWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {submission.institutionWebsite}
                          </a>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Location</dt>
                      <dd>
                        {submission.locationQuery ?? "—"}
                        {submission.latitude != null &&
                          submission.longitude != null && (
                            <span className="block text-xs text-slate-500">
                              User provided: {submission.latitude.toFixed(4)},{" "}
                              {submission.longitude.toFixed(4)}
                            </span>
                          )}
                        {submission.resolvedLatitude != null &&
                          submission.resolvedLongitude != null && (
                            <span className="block text-xs text-emerald-600">
                              Geocoded:{" "}
                              {submission.resolvedLatitude.toFixed(4)},{" "}
                              {submission.resolvedLongitude.toFixed(4)} (
                              {submission.geocodeStatus})
                            </span>
                          )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Status</dt>
                      <dd className="capitalize">
                        {submission.status} · Geocode:{" "}
                        {submission.geocodeStatus}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">
                        Linked institution
                      </dt>
                      <dd>
                        {submission.institution ? (
                          <>
                            <span className="font-semibold text-slate-900">
                              {submission.institution.name ??
                                submission.institution.id}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {submission.institution.id} ·{" "}
                              {submission.institution.country ?? "—"}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">
                        Marked duplicate of
                      </dt>
                      <dd>
                        {submission.duplicateOf ? (
                          <>
                            <span className="font-semibold text-slate-900">
                              {submission.duplicateOf.name ??
                                submission.duplicateOf.id}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {submission.duplicateOf.id} ·{" "}
                              {submission.duplicateOf.country ?? "—"}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                      Leadership approach
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">
                      {submission.leadershipApproach}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <form
                      action={updateSubmissionLink}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <input
                        type="hidden"
                        name="submissionId"
                        value={submission.id}
                      />
                      <input type="hidden" name="mode" value="institution" />
                      <label className="text-xs font-semibold text-slate-700">
                        Link to existing institution
                      </label>
                      <input
                        name="value"
                        defaultValue={submission.institutionId ?? ""}
                        placeholder="inst:ror:..."
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          name="action"
                          value="assign"
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Link
                        </button>
                        {submission.institutionId && (
                          <button
                            type="submit"
                            name="action"
                            value="clear"
                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </form>

                    <form
                      action={updateSubmissionLink}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <input
                        type="hidden"
                        name="submissionId"
                        value={submission.id}
                      />
                      <input type="hidden" name="mode" value="duplicate" />
                      <label className="text-xs font-semibold text-slate-700">
                        Mark as duplicate of
                      </label>
                      <input
                        name="value"
                        defaultValue={submission.duplicateOfId ?? ""}
                        placeholder="inst:ror:..."
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          name="action"
                          value="assign"
                          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Mark duplicate
                        </button>
                        {submission.duplicateOfId && (
                          <button
                            type="submit"
                            name="action"
                            value="clear"
                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <form
                    action={updateSubmissionStatus}
                    className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    <input
                      type="hidden"
                      name="submissionId"
                      value={submission.id}
                    />
                    <label className="flex flex-col gap-2 text-xs">
                      <span className="font-semibold text-slate-700">
                        Notes / Rejection reason
                      </span>
                      <textarea
                        name="notes"
                        placeholder="Optional notes for the submitter or internal tracking."
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        rows={3}
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        name="actionType"
                        value="approve"
                        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Approve &amp; publish
                      </button>
                      <button
                        type="submit"
                        name="actionType"
                        value="reject"
                        className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                      >
                        Reject submission
                      </button>
                    </div>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recently approved
            </h2>
            <span className="text-xs text-slate-500">
              Showing latest {approved.length} entries
            </span>
          </div>
          {approved.length === 0 ? (
            <p className="text-sm text-slate-600">No approved submissions.</p>
          ) : (
            <div className="grid gap-3 text-sm">
              {approved.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-emerald-900">
                        {submission.institutionName}
                      </h3>
                      <p className="text-xs text-emerald-700">
                        Approved {formatter.format(submission.approvedAt!)} by{" "}
                        {submission.approvedBy ?? "—"}
                      </p>
                      <p className="text-xs text-emerald-700">
                        Linked to:{" "}
                        {submission.institution
                          ? submission.institution.name ??
                            submission.institution.id
                          : "—"}
                      </p>
                    </div>
                    <form action={updateSubmissionStatus}>
                      <input
                        type="hidden"
                        name="submissionId"
                        value={submission.id}
                      />
                      <button
                        type="submit"
                        name="actionType"
                        value="reset"
                        className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
                      >
                        Move back to pending
                      </button>
                    </form>
                    <DeleteSubmissionButton
                      submissionId={submission.id}
                      action={deleteSubmissionAction}
                      variant="approved"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recently rejected
            </h2>
            <span className="text-xs text-slate-500">
              Showing latest {rejected.length} entries
            </span>
          </div>
          {rejected.length === 0 ? (
            <p className="text-sm text-slate-600">No rejected submissions.</p>
          ) : (
            <div className="grid gap-3 text-sm">
              {rejected.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-lg border border-red-200 bg-red-50/70 p-3"
                >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-red-900">
                      {submission.institutionName}
                    </h3>
                      <p className="text-xs text-red-700">
                        Rejected {formatter.format(submission.rejectedAt!)} by{" "}
                        {submission.approvedBy ?? getAdminIdentity()}
                      </p>
                      <p className="text-xs text-red-700">
                        Linked to:{" "}
                        {submission.institution
                          ? submission.institution.name ??
                            submission.institution.id
                          : "—"}
                      </p>
                  </div>
                  <form action={updateSubmissionStatus}>
                    <input
                      type="hidden"
                      name="submissionId"
                      value={submission.id}
                    />
                    <button
                      type="submit"
                      name="actionType"
                      value="reset"
                      className="text-xs font-semibold text-red-700 underline hover:text-red-900"
                    >
                      Move back to pending
                    </button>
                  </form>
                  <DeleteSubmissionButton
                    submissionId={submission.id}
                    action={deleteSubmissionAction}
                    variant="rejected"
                  />
                </div>
                  {submission.rejectionReason && (
                    <p className="mt-2 text-xs text-red-700">
                      Reason: {submission.rejectionReason}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
