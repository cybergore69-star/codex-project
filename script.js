if (!window.INSIGHTS || !Array.isArray(window.INSIGHTS)) {
  console.error("INSIGHTS missing");
}

const featuredTags = document.getElementById("featured-tags");
const featuredTitle = document.getElementById("featured-title");
const featuredExcerpt = document.getElementById("featured-excerpt");
const featuredBody = document.getElementById("featured-body");
const featuredImage = document.getElementById("featured-image");
const featuredCta = document.getElementById("featured-cta");
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

const renderFeatured = (insight) => {
  featuredTags.textContent = insight.tags.join(" · ");
  featuredTitle.textContent = insight.title;
  featuredExcerpt.textContent = insight.excerpt;
  const descriptionMeta = document.querySelector("meta[name=\"description\"]");
  const ogTitleMeta = document.querySelector("meta[property=\"og:title\"]");
  const ogDescriptionMeta = document.querySelector("meta[property=\"og:description\"]");
  const ogImageMeta = document.querySelector("meta[property=\"og:image\"]");
  if (descriptionMeta) {
    descriptionMeta.setAttribute("content", insight.excerpt);
  }
  if (ogTitleMeta) {
    ogTitleMeta.setAttribute("content", insight.title);
  }
  if (ogDescriptionMeta) {
    ogDescriptionMeta.setAttribute("content", insight.excerpt);
  }
  if (ogImageMeta) {
    if (insight.image) {
      ogImageMeta.setAttribute("content", insight.image);
    } else {
      ogImageMeta.setAttribute("content", "");
    }
  }

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

const setFeaturedById = (id) => {
  const insight = INSIGHTS.find((item) => item.id === id);
  if (!insight) return;
  renderFeatured(insight);
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

renderFeatured(INSIGHTS[0]);
renderList(INSIGHTS);
