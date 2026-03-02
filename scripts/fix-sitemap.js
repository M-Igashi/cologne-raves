import fs from "fs";
import path from "path";

const distDir = "./dist";
const sitemapIndexPath = path.join(distDir, "sitemap-index.xml");
const sitemap0Path = path.join(distDir, "sitemap-0.xml");
const sitemapPath = path.join(distDir, "sitemap.xml");

function getUrlMetadata(url) {
  if (url.endsWith("cologne.ravers.workers.dev/")) {
    return { priority: "1.0", changefreq: "daily" };
  }
  if (url.includes("/parties")) {
    return { priority: "0.9", changefreq: "daily" };
  }
  if (url.includes("/form")) {
    return { priority: "0.7", changefreq: "monthly" };
  }
  if (url.includes("/extract")) {
    return { priority: "0.3", changefreq: "monthly" };
  }
  return { priority: "0.5", changefreq: "weekly" };
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

  const today = new Date().toISOString().split("T")[0];
  let sitemapContent = fs.readFileSync(sitemap0Path, "utf8");

  sitemapContent = sitemapContent.replace(
    /<url>\s*<loc>(.*?)<\/loc>/g,
    function (match, url) {
      const { priority, changefreq } = getUrlMetadata(url);
      return `<url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
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
