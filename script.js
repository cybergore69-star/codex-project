if (!window.INSIGHTS || !Array.isArray(window.INSIGHTS)) {
  console.error("INSIGHTS missing");
}

const featuredTags = document.getElementById("featured-tags");
const featuredTitle = document.getElementById("featured-title");
const featuredExcerpt = document.getElementById("featured-excerpt");
const featuredBody = document.getElementById("featured-body");
const featuredImage = document.getElementById("featured-image");
const featuredCta = document.getElementById("featured-cta");
const featuredShare = document.getElementById("featured-share");
const insightList = document.getElementById("insight-list");

const scrollButtons = document.querySelectorAll("[data-scroll]");

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

  setMeta("og:title", insight.title);
  setMeta("og:description", insight.excerpt);
  setMeta("og:image", insight.image || "assets/default.jpg");
  setMeta("og:url", window.location.href);
}

const renderFeatured = (insight) => {
  featuredTags.textContent = insight.tags.join(" · ");
  featuredTitle.textContent = insight.title;
  featuredExcerpt.textContent = insight.excerpt;
  updateMetaTags(insight);

  if (insight.image) {
    featuredImage.src = insight.image;
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
  } else {
    featuredBody.classList.add("is-hidden");
    featuredCta.textContent = "Read Full Article";
    featuredCta.dataset.state = "collapsed";
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

const initialInsightId = getInsightFromQuery();
const initialInsight = initialInsightId
  ? INSIGHTS.find((item) => item.id === initialInsightId)
  : null;
renderFeatured(initialInsight || INSIGHTS[0]);
if (initialInsight) {
  updateInsightQuery(initialInsight.id);
}
renderList(INSIGHTS);

if (featuredShare) {
  featuredShare.addEventListener("click", async () => {
    const url = window.location.href;
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
