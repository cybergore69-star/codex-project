const INSIGHTS = [
    {
    id: "ai-adaptif-01",
    title: "AI Takkan Ganti Software Engineer — Tapi Engineer Yang Guna AI Akan Ganti Yang Tak Guna",
    tags: ["AI", "Strategy", "Future"],
    excerpt:
      "Setiap kali teknologi baru muncul, soalan yang sama akan timbul. Adakah mesin akan menggantikan manusia? Mungkin itu sebenarnya soalan yang salah.",
    body: [
      "Setiap kali teknologi baru muncul, soalan yang sama akan timbul. Adakah mesin akan menggantikan manusia?",
      "Mungkin itu sebenarnya soalan yang salah.",
      "Masalah sebenar bukan AI akan ambil kerja kita. Masalah sebenar ialah betapa cepatnya dunia berubah, dan betapa ramai yang masih selesa bergerak dengan cara lama.",
      "AI bukan sekadar alat untuk jadi lebih produktif. Ia mempercepatkan segala-galanya. Individu yang tahu menggunakannya akan bergerak jauh lebih laju daripada mereka yang masih menunggu keadaan kembali seperti biasa.",
      "Jurang masa depan mungkin bukan lagi antara manusia dan mesin. Jurang itu akan lebih jelas antara manusia yang adaptif dan manusia yang statik.",
      "Sejarah hampir selalu berpihak kepada mereka yang belajar lebih cepat daripada kadar perubahan. Kita sudah nampak corak ini sejak revolusi industri, kemudian internet, dan sekarang kecerdasan buatan.",
      "Teknologi jarang benar-benar menghapuskan manusia. Tetapi teknologi hampir selalu menggantikan mereka yang enggan berubah.",
      "Dalam dunia yang semakin dipacu AI, kelebihan terbesar mungkin bukan pengalaman bertahun-tahun. Yang lebih penting ialah keupayaan untuk belajar perkara baru, melepaskan cara lama, dan menyesuaikan diri dengan pantas.",
      "Jadi mungkin soalan yang patut kita tanya bukan sama ada AI akan menggantikan kita.",
      "Soalan yang lebih penting ialah, adakah kita bergerak cukup cepat untuk kekal relevan?",
    ],
  },
];

const featuredTags = document.getElementById("featured-tags");
const featuredTitle = document.getElementById("featured-title");
const featuredExcerpt = document.getElementById("featured-excerpt");
const featuredBody = document.getElementById("featured-body");
const featuredCta = document.getElementById("featured-cta");
const insightList = document.getElementById("insight-list");

const scrollButtons = document.querySelectorAll("[data-scroll]");

const renderFeatured = (insight) => {
  featuredTags.textContent = insight.tags.join(" · ");
  featuredTitle.textContent = insight.title;
  featuredExcerpt.textContent = insight.excerpt;
  featuredBody.innerHTML = insight.body.map((paragraph) => `<p>${paragraph}</p>`).join("");
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
