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
const insightList = document.getElementById("insight-list");

const scrollButtons = document.querySelectorAll("[data-scroll]");
const bodyInsightId = document.body.dataset.insightId || null;
const pageAssetPrefix = bodyInsightId ? "../" : "";
let currentInsightId = null;
let currentInsight = null;
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

const showComments = (insight) => {
  if (!cusdisThread) return;
  cusdisThread.classList.remove("is-hidden");
  if (window.CUSDIS) {
    CUSDIS.renderTo('#cusdis_thread', {
      appId: 'd1553e79-6dcc-4ea7-b641-ed4566b04fef',
      pageId: insight.id,
      pageUrl: window.location.href,
      pageTitle: insight.title
    });
  }
};

const hideComments = () => {
  if (!cusdisThread) return;
  cusdisThread.classList.add("is-hidden");
};

const renderFeatured = (insight) => {
  currentInsightId = insight.id;
  currentInsight = insight;
  featuredTags.textContent = insight.tags.join(" · ");
  featuredTitle.textContent = insight.title;
  featuredExcerpt.textContent = insight.excerpt;
  updateMetaTags(insight);
  hideComments();
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
    if (currentInsight) {
      showComments(currentInsight);
    }
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
