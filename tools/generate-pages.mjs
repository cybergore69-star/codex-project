import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const ORIGIN = "https://codex-project-zeta.vercel.app";
const ARTICLES_FILE = path.join(ROOT, "articles.js");
const INDEX_FILE = path.join(ROOT, "index.html");
const OUTPUT_DIR = path.join(ROOT, "p");

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const setMetaProperty = (html, property, content) => {
  const escaped = escapeAttr(content);
  const pattern = new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]*"\\s*>`);
  if (pattern.test(html)) {
    return html.replace(pattern, `<meta property="${property}" content="${escaped}">`);
  }
  return html.replace("</head>", `    <meta property="${property}" content="${escaped}">\n  </head>`);
};

const setMetaName = (html, name, content) => {
  const escaped = escapeAttr(content);
  const pattern = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*>`);
  if (pattern.test(html)) {
    return html.replace(pattern, `<meta name="${name}" content="${escaped}">`);
  }
  return html.replace("</head>", `    <meta name="${name}" content="${escaped}">\n  </head>`);
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

const generateArticlePage = (indexHtml, insight) => {
  const imagePath = insight.image || "assets/default.jpg";
  const absoluteImage = `${ORIGIN}/${imagePath.replace(/^\//, "")}`;
  const pageUrl = `${ORIGIN}/p/${insight.id}.html`;

  let page = indexHtml;
  page = page.replace("<body>", `<body data-insight-id="${escapeAttr(insight.id)}">`);
  page = page.replace('href="styles.css"', 'href="../styles.css"');
  page = page.replace('src="articles.js"', 'src="../articles.js"');
  page = page.replace('src="script.js"', 'src="../script.js"');
  page = page.replace(/src="assets\//g, 'src="../assets/');

  page = setMetaProperty(page, "og:type", "article");
  page = setMetaProperty(page, "og:title", insight.title || "Rebel Insight");
  page = setMetaProperty(page, "og:description", insight.excerpt || "Fikir. Tulis. Gegarkan.");
  page = setMetaProperty(page, "og:image", absoluteImage);
  page = setMetaProperty(page, "og:url", pageUrl);
  page = setMetaName(page, "twitter:card", "summary_large_image");

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

const run = async () => {
  const [indexHtml, insights] = await Promise.all([
    fs.readFile(INDEX_FILE, "utf8"),
    parseInsights(),
  ]);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const insight of insights) {
    if (!insight || !insight.id) continue;
    const output = generateArticlePage(indexHtml, insight);
    const outPath = path.join(OUTPUT_DIR, `${insight.id}.html`);
    await fs.writeFile(outPath, output, "utf8");
  }

  await fs.writeFile(path.join(OUTPUT_DIR, "index.html"), generateIndexPage(), "utf8");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
