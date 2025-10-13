/* prisma/seed.js */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { PrismaClient } = require("@prisma/client");

function createClient() {
  return new PrismaClient({
    log: ["warn", "error"],
  });
}

let prisma = createClient();

async function withRetry(label, fn, maxRetries = 5) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn(prisma);
    } catch (err) {
      const retryable =
        err &&
        (err.code === "P1001" || // can't reach db
          err.code === "P2024" || // pool timeout
          err.code === "P1008"); // operation timed out

      if (!retryable || attempt >= maxRetries) {
        throw err;
      }

      attempt += 1;
      const waitMs = Math.min(500 * attempt, 4000);
      console.warn(
        `${label}: lost connection (attempt ${attempt}/${maxRetries}). Retrying in ${waitMs} ms…`
      );

      try {
        await prisma.$disconnect();
      } catch (_) {
        /* ignore disconnect errors */
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      prisma = createClient();
    }
  }
}

const DATA_DIR = path.join(process.cwd(), "data");
const PAPERS_FILE = fs.existsSync(path.join(DATA_DIR, "chiplay_papers_with_doi.json"))
  ? path.join(DATA_DIR, "chiplay_papers_with_doi.json")
  : path.join(DATA_DIR, "chiplay_papers.json");
const GEO_FILE = path.join(DATA_DIR, "chiplay_institutions_geo.json");
const OA_JL = path.join(DATA_DIR, "openalex_authorships.jsonl");
async function countLines(filePath) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    stream.on("error", reject);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on("line", () => {
      count += 1;
    });
    rl.on("close", () => resolve(count));
  });
}

function doiFromEe(ee) {
  if (typeof ee === "string" && ee.startsWith("https://doi.org/")) {
    return ee.replace("https://doi.org/", "");
  }
  return null;
}
function slug(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function instIdFromOA(ai) {
  const ror = (ai.ror || "").split("/").pop();
  if (ror) return `inst:ror:${ror}`;
  const name = ai.display_name || "";
  if (!name) return null;
  return `inst:name:${slug(name)}`;
}

function toOrder(v) {
    if (typeof v === "number" && Number.isInteger(v)) return v;
    if (typeof v === "string") {
      const m = v.match(/^\d+$/);
      if (m) return parseInt(m[0], 10);
      if (v === "first") return 1;
      if (v === "last") return 9999; // arbitrary high value to sort last
      // "middle" or anything else:
      return null;
    }
    return null;
  }  

async function safeUpdatePaperIds(paper, { openalexId, doi }) {
  const data = {};

  if (doi) {
    const doiOwner = await withRetry("paper.findUnique(doi)", (client) =>
      client.paper.findUnique({ where: { doi } })
    );
    if (!doiOwner || doiOwner.id === paper.id) {
      data.doi = doi;
    } else {
      console.log(`  ↪︎ skip DOI (in use by ${doiOwner.dblpKey}): ${doi}`);
    }
  }

  if (openalexId) {
    const oaOwner = await withRetry("paper.findUnique(openalexId)", (client) =>
      client.paper.findUnique({ where: { openalexId } })
    );
    if (!oaOwner || oaOwner.id === paper.id) {
      data.openalexId = openalexId;
    } else {
      console.log(`  ↪︎ skip OpenAlex ID (in use by ${oaOwner.dblpKey}): ${openalexId}`);
    }
  }

  if (Object.keys(data).length) {
    await withRetry("paper.update", (client) =>
      client.paper.update({ where: { id: paper.id }, data })
    );
  }
}

async function seedInstitutionsGeo() {
  if (!fs.existsSync(GEO_FILE)) {
    console.log("No geo file, skipping.");
    return;
  }
  const geo = JSON.parse(fs.readFileSync(GEO_FILE, "utf-8"));
  let up = 0;
  for (const g of geo) {
    await withRetry("institution.upsert(geo)", (client) =>
      client.institution.upsert({
        where: { id: g.id },
        update: {
          name: g.name ?? undefined,
          country: g.country ?? undefined,
          lat: g.lat ?? undefined,
          lng: g.lng ?? undefined,
          type: g.type ?? undefined,
        },
        create: {
          id: g.id,
          name: g.name ?? null,
          country: g.country ?? null,
          lat: g.lat ?? null,
          lng: g.lng ?? null,
          type: g.type ?? null,
        },
      })
    );
    up++;
  }
  console.log(`Institutions (geo) upserted: ${up}`);
}

async function seedPapers() {
  if (!fs.existsSync(PAPERS_FILE)) throw new Error("Missing papers JSON");
  const papers = JSON.parse(fs.readFileSync(PAPERS_FILE, "utf-8"));
  let up = 0;
  for (const p of papers) {
    const dblpKey = p?.source?.dblp_key || p?.source?.dblpKey || null;
    if (!dblpKey) continue;
    const doi = p.doi && String(p.doi).startsWith("10.") ? p.doi : doiFromEe(p.ee);
    await withRetry("paper.upsert", (client) =>
      client.paper.upsert({
        where: { dblpKey },
        update: {
          title: p.title,
          year: Number.isInteger(p.year) ? p.year : null,
          venue: p.venue || "CHI PLAY",
          doi: doi || undefined,
        },
        create: {
          dblpKey,
          title: p.title,
          year: Number.isInteger(p.year) ? p.year : null,
          venue: p.venue || "CHI PLAY",
          doi: doi || null,
        },
      })
    );
    up++;
    if (up % 200 === 0) console.log(`  papers upserted: ${up}`);
  }
  console.log(`Papers upserted: ${up}`);
}

async function seedAuthorshipsFromOpenAlex() {
  if (!fs.existsSync(OA_JL)) {
    console.log("No OpenAlex JSONL, skipping authorships.");
    return;
  }
  const totalLines = await countLines(OA_JL);
  if (totalLines > 0) {
    console.log(`OpenAlex authorships to process: ${totalLines}`);
  }
  const rl = readline.createInterface({
    input: fs.createReadStream(OA_JL, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineNo = 0, linked = 0, skipped = 0, paperMiss = 0;
  const logProgress = () => {
    if (!totalLines) return;
    const pct = ((lineNo / totalLines) * 100).toFixed(1);
    process.stdout.write(
      `\r  processed: ${lineNo}/${totalLines} (${pct}%) | links: ${linked}`
    );
  };
  for await (const line of rl) {
    if (!line.trim()) continue;
    let obj; try { obj = JSON.parse(line); } catch { continue; }

    const dblpKey = obj?.dblp_key;
    if (!dblpKey) { skipped++; continue; }

    const paper = await withRetry("paper.findUnique(dblpKey)", (client) =>
      client.paper.findUnique({ where: { dblpKey } })
    );
    if (!paper) { paperMiss++; continue; }

    const openalexId = obj?.id || null;
    const doiFromOA  = (obj?.doi || "").replace("https://doi.org/","") || null;
        if (openalexId || doiFromOA) {
            await safeUpdatePaperIds(paper, { openalexId, doi: doiFromOA || paper.doi || null });
        }

    const authorships = Array.isArray(obj?.authorships) ? obj.authorships : [];
    for (const as of authorships) {
      const authorName = as?.author?.display_name || "Unknown";
      const authorOA   = as?.author?.id || null;

      let author;
      if (authorOA) {
        author = await withRetry("author.upsert(openalexId)", (client) =>
          client.author.upsert({
            where: { openalexId: authorOA },
            update: { name: authorName },
            create: { name: authorName, openalexId: authorOA },
          })
        );
      } else {
        author =
          (await withRetry("author.findFirst(name)", (client) =>
            client.author.findFirst({ where: { name: authorName } })
          )) ||
          (await withRetry("author.create", (client) =>
            client.author.create({ data: { name: authorName } })
          ));
      }

      const insts = Array.isArray(as?.institutions) ? as.institutions : [];
      for (const ai of insts) {
        const instId = instIdFromOA(ai);
        if (!instId) continue;

        await withRetry("institution.upsert(authorship)", (client) =>
          client.institution.upsert({
            where: { id: instId },
            update: {
              name: ai.display_name ?? undefined,
              country: ai.country_code ?? undefined,
            },
            create: {
              id: instId,
              name: ai.display_name ?? null,
              country: ai.country_code ?? null,
            },
          })
        );

        await withRetry("authorship.upsert", (client) =>
          client.authorship.upsert({
            where: {
              paperId_authorId_institutionId: {
                paperId: paper.id,
                authorId: author.id,
                institutionId: instId,
              },
            },
            update: {},
            create: {
              paperId: paper.id,
              authorId: author.id,
              institutionId: instId,
              order: toOrder(as.author_position),
            },
          })
        );
        linked++;
      }
    }

    lineNo++;
    if (totalLines && (lineNo % 5 === 0 || lineNo === totalLines)) {
      logProgress();
    } else if (!totalLines && lineNo % 200 === 0) {
      console.log(`  processed: ${lineNo} | links: ${linked}`);
    }
  }

  if (totalLines) {
    logProgress();
    process.stdout.write("\n");
  }
  console.log(`Authorships: linked=${linked} | skipped=${skipped} | papers missing=${paperMiss}`);
}

async function main() {
  try {
    await seedInstitutionsGeo();
    await seedPapers();
    await seedAuthorshipsFromOpenAlex();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
