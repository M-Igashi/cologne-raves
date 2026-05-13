import fs from "fs";
import path from "path";
import { execSync } from "node:child_process";

const distDir = "./dist";
const dataDir = "./data";
const sitemapIndexPath = path.join(distDir, "sitemap-index.xml");
const sitemap0Path = path.join(distDir, "sitemap-0.xml");
const sitemapPath = path.join(distDir, "sitemap.xml");

// Last-modified date for static pages (/form, /extract).
// Update only when those pages' content actually changes.
const STATIC_LASTMOD = "2026-04-09";

function getGitLastModified(filePath) {
  try {
    const result = execSync(`git log -1 --format=%aI -- "${filePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return result ? new Date(result) : null;
  } catch {
    try {
      return fs.statSync(filePath).mtime;
    } catch {
      return null;
    }
  }
}

// Compute the latest data update across all party JSON files.
// Used for /, /parties — pages whose content reflects the underlying party data.
function getLatestDataDate() {
  try {
    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.endsWith(".json") && f !== "manifest.json" && !f.startsWith("."));
    let latest = new Date(0);
    for (const file of files) {
      const d = getGitLastModified(path.join(dataDir, file));
      if (d && d > latest) latest = d;
    }
    if (latest.getTime() === 0) return STATIC_LASTMOD;
    return latest.toISOString().split("T")[0];
  } catch {
    return STATIC_LASTMOD;
  }
}

function getUrlMetadata(url, dynamicLastmod) {
  if (url.endsWith("cologne.ravers.workers.dev/")) {
    return { priority: "1.0", changefreq: "daily", lastmod: dynamicLastmod };
  }
  if (url.includes("/parties")) {
    return { priority: "0.9", changefreq: "daily", lastmod: dynamicLastmod };
  }
  if (url.includes("/form")) {
    return { priority: "0.7", changefreq: "monthly", lastmod: STATIC_LASTMOD };
  }
  if (url.includes("/extract")) {
    return { priority: "0.3", changefreq: "monthly", lastmod: STATIC_LASTMOD };
  }
  return { priority: "0.5", changefreq: "weekly", lastmod: STATIC_LASTMOD };
}

function formatXmlNamespaces(content) {
  return content
    .replace(/><url>/g, ">\n  <url>")
    .replace(/<\/url><url>/g, "</url>\n  <url>")
    .replace(/<\/url><\/urlset>/g, "</url>\n</urlset>")
    .replace(
      /xmlns:news="[^"]*"/g,
      '\n    xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"',
    )
    .replace(
      /xmlns:xhtml="[^"]*"/g,
      '\n    xmlns:xhtml="http://www.w3.org/1999/xhtml"',
    )
    .replace(
      /xmlns:image="[^"]*"/g,
      '\n    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    )
    .replace(
      /xmlns:video="[^"]*"/g,
      '\n    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
    );
}

function processSitemap() {
  if (!fs.existsSync(sitemap0Path)) {
    console.log("sitemap-0.xml not found, skipping sitemap consolidation");
    return;
  }

  const dynamicLastmod = getLatestDataDate();
  let sitemapContent = fs.readFileSync(sitemap0Path, "utf8");

  sitemapContent = sitemapContent.replace(
    /<url>\s*<loc>(.*?)<\/loc>/g,
    function (match, url) {
      const { priority, changefreq, lastmod } = getUrlMetadata(url, dynamicLastmod);
      return `<url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;
    },
  );

  const formattedContent = formatXmlNamespaces(sitemapContent);
  fs.writeFileSync(sitemapPath, formattedContent);

  if (fs.existsSync(sitemapIndexPath)) {
    fs.unlinkSync(sitemapIndexPath);
  }
  fs.unlinkSync(sitemap0Path);

  console.log("Single sitemap.xml created successfully with SEO optimizations");
}

try {
  processSitemap();
} catch (error) {
  console.error("Error processing sitemap:", error.message);
}
