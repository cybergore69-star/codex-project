if (!window.INSIGHTS || !Array.isArray(window.INSIGHTS)) {
  console.error("INSIGHTS missing");
}
const INSIGHTS = window.INSIGHTS || [];
const featuredTags = document.getElementById("featured-tags");
const featuredTitle = document.getElementById("featured-title");
const featuredExcerpt = document.getElementById("featured-excerpt");
const featuredBody = document.getElementById("featured-body");
const featuredImage = document.getElementById("featured-image");
const featuredCta = document.getElementById("featured-cta");
const featuredShare = document.getElementById("featured-share");
const cusdisThread = document.getElementById("cusdis_thread");
const commentsWrap = document.getElementById("comments-wrap");
const insightList = document.getElementById("insight-list");
const scrollButtons = document.querySelectorAll("[data-scroll]");
const bodyInsightId = document.body.dataset.insightId || null;
const pageAssetPrefix = bodyInsightId ? "../" : "";
let currentInsightId = null;
let currentInsight = null;
const toPageAssetPath = (assetPath) => {
  if (!assetPath) return "";
  if (assetPath.startsWith("http://") || assetPath.startsWith("https://") || assetPath.startsWith("/")) {
    return assetPath;
  }
  return `${pageAssetPrefix}${assetPath}`;
};
const toAbsoluteAssetUrl = (assetPath) => {
  const relativePath = assetPath || "assets/default.jpg";
  const normalized = relativePath.replace(/^\.\//, "").replace(/^\//, "");
  return `${window.location.origin}/${normalized}`;
};
const parseMarkdown = (text) => {
  if (!text) return "";
  if (text.startsWith("### ")) {
    return `<h3>${text.slice(4)}</h3>`;
  }
  if (text.startsWith("## ")) {
    return `<h2>${text.slice(3)}</h2>`;
  }
  const strongText = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return `<p>${strongText}</p>`;
};

const slugify = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const safeText = (text) => (text ? text.toString().trim() : "");

const setMeta = (attr, key, value) => {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
};

const updateSEO = (insight) => {
  const site = window.SITE || {};
  const siteName = site.name || "Rebel Insight";
  const siteUrl = site.url || window.location.origin;
  const defaultDescription = site.defaultDescription || "";
  const title = insight && insight.title ? `${insight.title} — ${siteName}` : siteName;
  const description = insight && insight.excerpt ? safeText(insight.excerpt) : defaultDescription;
  const canonical = insight && insight.id ? `${siteUrl}/${insight.id}.html` : `${siteUrl}/`;
  const imageUrl = insight && insight.image
    ? `${siteUrl}/${insight.image.replace(/^\//, "")}`
    : `${siteUrl}/assets/default.jpg`;

  document.title = title;

  // standard
  let desc = document.querySelector('meta[name="description"]');
  if (!desc) {
    desc = document.createElement("meta");
    desc.setAttribute("name", "description");
    document.head.appendChild(desc);
  }
  desc.setAttribute("content", description);

  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute("href", canonical);

  // OpenGraph
  setMeta("property", "og:type", "article");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:image", imageUrl);
  setMeta("property", "og:url", canonical);

  // Twitter
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", imageUrl);

  // JSON-LD
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight && insight.title ? insight.title : siteName,
    description,
    image: insight && insight.image ? [imageUrl] : undefined,
    author: site.author
      ? { "@type": "Person", name: site.author.name, url: site.author.url }
      : undefined,
    publisher: { "@type": "Organization", name: siteName },
    mainEntityOfPage: canonical,
    url: canonical
  };

  const jsonLd = document.getElementById("ld-json") || document.createElement("script");
  jsonLd.id = "ld-json";
  jsonLd.type = "application/ld+json";
  jsonLd.textContent = JSON.stringify(ld, (k, v) => (v === undefined ? undefined : v));
  if (!jsonLd.parentNode) {
    document.head.appendChild(jsonLd);
  }
};

function updateMetaTags(insight) {
  const setMeta = (property, content) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  const shareUrl = `${window.location.origin}/p/${insight.id}.html`;
  setMeta("og:type", "article");
  setMeta("og:title", insight.title);
  setMeta("og:description", insight.excerpt);
  setMeta("og:image", toAbsoluteAssetUrl(insight.image));
  setMeta("og:url", shareUrl);
}
const hideComments = () => {
  if (!commentsWrap) return;
  commentsWrap.classList.add("is-hidden");
  commentsWrap.classList.remove("comments-visible");
};

const showComments = (insight) => {
  if (!commentsWrap) return;
  const activeInsight = insight || currentInsight;
  if (!activeInsight) return;
  commentsWrap.classList.remove("is-hidden");
  commentsWrap.classList.add("comments-visible");
  if (cusdisThread) {
    const pageUrl = `${location.origin}/p/${activeInsight.id}.html`;
    cusdisThread.dataset.pageId = activeInsight.id;
    cusdisThread.dataset.pageUrl = pageUrl;
    cusdisThread.dataset.pageTitle = activeInsight.title;
  }
  if (window.CUSDIS && window.CUSDIS.renderTo) {
    window.CUSDIS.renderTo('#cusdis_thread', {
      appId: 'd1553e79-6dcc-4ea7-b641-ed4566b04fef',
      pageId: activeInsight.id,
      pageUrl: `${location.origin}/p/${activeInsight.id}.html`,
      pageTitle: activeInsight.title
    });
  } else if (window.CUSDIS && window.CUSDIS.initial) {
    window.CUSDIS.initial();
  }
};

const renderFeatured = (insight) => {
  currentInsightId = insight.id;
  currentInsight = insight;
  featuredTags.textContent = insight.tags.join(" · ");
  featuredTitle.textContent = insight.title;
  featuredExcerpt.textContent = insight.excerpt;
  updateMetaTags(insight);
  updateSEO(insight);
  hideComments();

  if (cusdisThread) {
    const pageUrl = `${location.origin}/p/${insight.id}.html`;
    cusdisThread.dataset.pageId = insight.id;
    cusdisThread.dataset.pageUrl = pageUrl;
    cusdisThread.dataset.pageTitle = insight.title;
  }

  if (insight.image) {
    featuredImage.src = toPageAssetPath(insight.image);
    featuredImage.alt = insight.title;
    featuredImage.classList.remove("is-hidden");
  } else {
    featuredImage.removeAttribute("src");
    featuredImage.classList.add("is-hidden");
  }
  featuredBody.innerHTML = insight.body.map((paragraph) => parseMarkdown(paragraph)).join("");
  featuredCta.dataset.state = "collapsed";
  featuredBody.classList.add("is-hidden");
};


const renderList = (insights) => {
  insightList.innerHTML = insights
    .map(
      (insight) => `
        <button class="insight-item" data-id="${insight.id}" type="button">
          <span class="insight-title">${insight.title}</span>
          <span class="insight-tags">${insight.tags.join(" · ")}</span>
        </button>
      `
    )
    .join("");
};
const updateInsightQuery = (id) => {
  if (bodyInsightId) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("insight", id);
    window.history.replaceState({}, "", url);
  } catch (error) {
    console.error(error);
  }
};
const getInsightFromQuery = () => {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("insight");
  } catch (error) {
    console.error(error);
    return null;
  }
};
const setFeaturedById = (id) => {
  const insight = INSIGHTS.find((item) => item.id === id);
  if (!insight) return;
  renderFeatured(insight);
  updateInsightQuery(insight.id);
};
featuredCta.addEventListener("click", () => {
  const isCollapsed = featuredCta.dataset.state === "collapsed";
  if (isCollapsed) {
    featuredBody.classList.remove("is-hidden");
    featuredCta.textContent = "Collapse";
    featuredCta.dataset.state = "expanded";
    showComments(currentInsight);
  } else {
    featuredBody.classList.add("is-hidden");
    featuredCta.textContent = "Read Full Article";
    featuredCta.dataset.state = "collapsed";
    hideComments();
  }
});

insightList.addEventListener("click", (event) => {
  const item = event.target.closest(".insight-item");
  if (!item) return;
  setFeaturedById(item.dataset.id);
  featuredCta.textContent = "Read Full Article";
  featuredCta.dataset.state = "collapsed";
  featuredBody.classList.add("is-hidden");
  hideComments();
});
scrollButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-scroll");
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});
const initialInsightId = bodyInsightId || getInsightFromQuery();
const initialInsight = initialInsightId
  ? INSIGHTS.find((item) => item.id === initialInsightId)
  : null;
if (INSIGHTS.length > 0) {
  renderFeatured(initialInsight || INSIGHTS[0]);
  if (!bodyInsightId && initialInsight) {
    updateInsightQuery(initialInsight.id);
  }
  renderList(INSIGHTS);
}
if (featuredShare) {
  featuredShare.addEventListener("click", async () => {
    const shareId = currentInsightId || (INSIGHTS[0] ? INSIGHTS[0].id : "");
    if (!shareId) return;
    const url = `${window.location.origin}/p/${shareId}.html`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: featuredTitle.textContent || document.title,
          text: featuredExcerpt.textContent || "",
          url,
        });
      } else {
        window.prompt("Copy this link", url);
      }
    } catch (error) {
      console.error(error);
    }
  });
}
