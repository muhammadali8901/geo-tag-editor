const fs = require("fs");
const path = require("path");

const root = process.cwd();
const TITLE_MIN = 50;
const TITLE_MAX = 60;
const DESC_MIN = 140;
const DESC_MAX = 160;

function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(full));
    else if (/\.html?$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/");
}

const files = walk(root);
const existingRoutes = new Set(files.map((f) => "/" + rel(f).replace(/index\.html$/i, "")));
existingRoutes.add("/");

const findings = {
  totalPages: files.length,
  missingTitle: [],
  badTitleLength: [],
  missingDescription: [],
  badDescriptionLength: [],
  missingCanonical: [],
  badH1Count: [],
  hasMetaKeywords: [],
  brokenInternalLinks: [],
};

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const fileRel = rel(file);
  const isRedirectStub =
    /<meta[^>]+http-equiv=["']refresh["'][^>]+url=/i.test(html) &&
    /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
  const isTemplateOrPartial =
    fileRel.startsWith("partials/") ||
    fileRel.includes("template") ||
    fileRel === "adsense-placements.html";
  const isLocalTestPage = fileRel === "test-coordinate-input.html";
  if (isRedirectStub || isTemplateOrPartial || isLocalTestPage) continue;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  if (!title) findings.missingTitle.push(fileRel);
  else if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    findings.badTitleLength.push(`${fileRel}:${title.length}`);
  }

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);
  const description = descMatch ? descMatch[1].trim() : "";
  if (!description) findings.missingDescription.push(fileRel);
  else if (description.length < DESC_MIN || description.length > DESC_MAX) {
    findings.badDescriptionLength.push(`${fileRel}:${description.length}`);
  }

  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+["'][^>]*>/i);
  if (!canonical) findings.missingCanonical.push(fileRel);

  const h1Count = (html.match(/<h1\b[^>]*>/gi) || []).length;
  if (h1Count !== 1) findings.badH1Count.push(`${fileRel}:h1=${h1Count}`);

  if (/<meta\s+name=["']keywords["']/i.test(html)) findings.hasMetaKeywords.push(fileRel);

  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"'#?]+)(?:[#?][^"']*)?["']/gi)]
    .map((m) => m[1])
    .filter((href) => !/^(https?:|mailto:|tel:|javascript:)/i.test(href));

  let broken = 0;
  for (const href of links) {
    let normalized = href.startsWith("/")
      ? href
      : "/" + path.posix.normalize(path.posix.join("/" + path.posix.dirname(fileRel), href));
    normalized = normalized.replace(/\/+/g, "/");
    if (
      !existingRoutes.has(normalized) &&
      !existingRoutes.has(normalized + "/") &&
      !existingRoutes.has(normalized.replace(/\.html?$/i, "/"))
    ) {
      broken++;
    }
  }
  if (broken > 0) findings.brokenInternalLinks.push(`${fileRel}:${broken}`);
}

const summary = {
  totalPages: findings.totalPages,
  missingTitle: findings.missingTitle.length,
  badTitleLength: findings.badTitleLength.length,
  missingDescription: findings.missingDescription.length,
  badDescriptionLength: findings.badDescriptionLength.length,
  missingCanonical: findings.missingCanonical.length,
  badH1Count: findings.badH1Count.length,
  hasMetaKeywords: findings.hasMetaKeywords.length,
  brokenInternalLinks: findings.brokenInternalLinks.length,
};

console.log("SEO QA Summary");
console.log(JSON.stringify(summary, null, 2));
console.log("\nDetailed findings:");
console.log(JSON.stringify(findings, null, 2));
