import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const ARTICLES_FILE = path.join(ROOT, "articles.js");
const INDEX_FILE = path.join(ROOT, "index.html");
const SEO_FILE = path.join(ROOT, "seo.config.js");
const OUTPUT_DIR = path.join(ROOT, "p");

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const setMetaProperty = (html, property, content) => {
  const escaped = escapeAttr(content);
  const pattern = new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]*"\\s*/?>`);
  if (pattern.test(html)) {
    return html.replace(pattern, `<meta property="${property}" content="${escaped}">`);
  }
  return html.replace("</head>", `    <meta property="${property}" content="${escaped}">\n  </head>`);
};

const setMetaName = (html, name, content) => {
  const escaped = escapeAttr(content);
  const pattern = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`);
  if (pattern.test(html)) {
    return html.replace(pattern, `<meta name="${name}" content="${escaped}">`);
  }
  return html.replace("</head>", `    <meta name="${name}" content="${escaped}">\n  </head>`);
};

const setTitle = (html, title) => {
  const escaped = escapeAttr(title);
  if (/<title>.*<\/title>/.test(html)) {
    return html.replace(/<title>.*<\/title>/, `<title>${escaped}</title>`);
  }
  return html.replace("</head>", `    <title>${escaped}</title>\n  </head>`);
};

const setCanonical = (html, href) => {
  const escaped = escapeAttr(href);
  const pattern = /<link\s+rel="canonical"\s+href="[^"]*"\s*/?>/i;
  if (pattern.test(html)) {
    return html.replace(pattern, `<link rel="canonical" href="${escaped}" />`);
  }
  return html.replace("</head>", `    <link rel="canonical" href="${escaped}" />\n  </head>`);
};

const setJsonLd = (html, data) => {
  const json = JSON.stringify(data);
  const scriptTag = `<script id="ld-json" type="application/ld+json">${json}</script>`;
  if (/<script id="ld-json"[^>]*>.*<\/script>/.test(html)) {
    return html.replace(/<script id="ld-json"[^>]*>.*<\/script>/, scriptTag);
  }
  return html.replace("</head>", `    ${scriptTag}\n  </head>`);
};

const parseInsights = async () => {
  const source = await fs.readFile(ARTICLES_FILE, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: "articles.js" }).runInContext(sandbox);
  if (!Array.isArray(sandbox.window.INSIGHTS)) {
    throw new Error("window.INSIGHTS is missing or not an array");
  }
  return sandbox.window.INSIGHTS;
};

const parseSite = async () => {
  const source = await fs.readFile(SEO_FILE, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: "seo.config.js" }).runInContext(sandbox);
  if (!sandbox.window.SITE) {
    throw new Error("window.SITE is missing");
  }
  return sandbox.window.SITE;
};

const generateArticlePage = (indexHtml, insight, site) => {
  const siteUrl = site.url || "";
  const defaultDescription = site.defaultDescription || "";
  const imagePath = insight.image || "assets/default.jpg";
  const absoluteImage = `${siteUrl}/${imagePath.replace(/^\//, "")}`;
  const canonical = `${siteUrl}/${insight.id}.html`;
  const title = `${insight.title} — ${site.name}`;
  const description = insight.excerpt || defaultDescription;

  let page = indexHtml;
  page = page.replace("<body>", `<body data-insight-id="${escapeAttr(insight.id)}">`);
  page = page.replace('href="styles.css"', 'href="../styles.css"');
  page = page.replace('src="seo.config.js"', 'src="../seo.config.js"');
  page = page.replace('src="articles.js"', 'src="../articles.js"');
  page = page.replace('src="script.js"', 'src="../script.js"');
  page = page.replace(/src="assets\//g, 'src="../assets/');

  page = setTitle(page, title);
  page = setCanonical(page, canonical);
  page = setMetaName(page, "description", description);

  page = setMetaProperty(page, "og:type", "article");
  page = setMetaProperty(page, "og:title", title);
  page = setMetaProperty(page, "og:description", description);
  page = setMetaProperty(page, "og:image", absoluteImage);
  page = setMetaProperty(page, "og:url", canonical);

  page = setMetaName(page, "twitter:card", "summary_large_image");
  page = setMetaName(page, "twitter:title", title);
  page = setMetaName(page, "twitter:description", description);
  page = setMetaName(page, "twitter:image", absoluteImage);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight.title,
    description,
    image: [absoluteImage],
    author: { "@type": "Person", name: site.author.name, url: site.author.url },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: canonical,
    url: canonical
  };

  page = setJsonLd(page, ld);
  return page;
};

const generateIndexPage = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=/" />
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting to <a href="/">home page</a>...</p>
  </body>
</html>
`;

const generateSitemap = (siteUrl, insights) => {
  const today = new Date().toISOString().split("T")[0];
  const urls = [
    `${siteUrl}/`,
    ...insights.map((insight) => `${siteUrl}/${insight.id}.html`)
  ];
  const items = urls
    .map((loc) => `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
};

const generateRss = (siteUrl, site, insights) => {
  const items = insights
    .map((insight) => {
      const link = `${siteUrl}/${insight.id}.html`;
      return `  <item>\n    <title>${escapeAttr(insight.title)}</title>\n    <link>${link}</link>\n    <guid>${link}</guid>\n    <description>${escapeAttr(insight.excerpt || "")}</description>\n  </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>${escapeAttr(site.name)}</title>\n  <link>${siteUrl}</link>\n  <description>${escapeAttr(site.defaultDescription || "")}</description>\n${items}\n</channel>\n</rss>\n`;
};

const run = async () => {
  const [indexHtml, insights, site] = await Promise.all([
    fs.readFile(INDEX_FILE, "utf8"),
    parseInsights(),
    parseSite()
  ]);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const insight of insights) {
    if (!insight || !insight.id) continue;
    const output = generateArticlePage(indexHtml, insight, site);
    const outPath = path.join(OUTPUT_DIR, `${insight.id}.html`);
    await fs.writeFile(outPath, output, "utf8");
  }

  await fs.writeFile(path.join(OUTPUT_DIR, "index.html"), generateIndexPage(), "utf8");

  const sitemap = generateSitemap(site.url, insights);
  await fs.writeFile(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");

  const rss = generateRss(site.url, site, insights);
  await fs.writeFile(path.join(ROOT, "rss.xml"), rss, "utf8");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
