const TOTAL_PAGES = 271;

const chapters = [
  { number: "آغاز", title: "روی جلد و راهنمای مطالعه", start: 1, end: 1 },
  { number: "۱", title: "تنظیم عصبی", start: 2, end: 30 },
  { number: "۲", title: "حواس", start: 31, end: 64 },
  { number: "۳", title: "دستگاه حرکتی", start: 65, end: 91 },
  { number: "۴", title: "تنظیم شیمیایی", start: 92, end: 111 },
  { number: "۵", title: "ایمنی", start: 112, end: 144 },
  { number: "۶", title: "تقسیم یاخته", start: 145, end: 174 },
  { number: "۷", title: "تولید مثل", start: 175, end: 219 },
  { number: "۸", title: "تولید مثل در نهان‌دانگان", start: 220, end: 247 },
  { number: "۹", title: "پاسخ گیاهان به محرک‌ها", start: 248, end: 271 },
];

const persianDigits = new Intl.NumberFormat("fa-IR");
const pageImage = document.querySelector("#pageImage");
const pageSheet = document.querySelector("#pageSheet");
const pageStage = document.querySelector("#pageStage");
const pageInput = document.querySelector("#pageInput");
const captionPage = document.querySelector("#captionPage");
const chapterKicker = document.querySelector("#chapterKicker");
const chapterTitle = document.querySelector("#chapterTitle");
const chapterList = document.querySelector("#chapterList");
const readingProgress = document.querySelector("#readingProgress");
const prevPage = document.querySelector("#prevPage");
const nextPage = document.querySelector("#nextPage");
const loading = document.querySelector("#loading");
const sidebar = document.querySelector("#sidebar");
const scrim = document.querySelector("#scrim");

let currentPage = 1;
let zoom = 1;
let pointerStartX = null;

function pagePath(page) {
  return `page-${String(page).padStart(3, "0")}.webp`;
}

function activeChapter(page = currentPage) {
  return chapters.find((chapter) => page >= chapter.start && page <= chapter.end) || chapters[0];
}

function renderChapters() {
  chapterList.innerHTML = chapters
    .map(
      (chapter) => `
        <button class="chapter-link" type="button" data-page="${chapter.start}" aria-label="رفتن به ${chapter.title}">
          <span class="chapter-link__number">${chapter.number}</span>
          <span class="chapter-link__copy">
            <strong>${chapter.title}</strong>
            <small>صفحه ${persianDigits.format(chapter.start)}${chapter.end > chapter.start ? ` تا ${persianDigits.format(chapter.end)}` : ""}</small>
          </span>
          <span class="chapter-link__arrow" aria-hidden="true">←</span>
        </button>`,
    )
    .join("");

  chapterList.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(Number(button.dataset.page));
      closeSidebar();
    });
  });
}

function updateChapterUI() {
  const chapter = activeChapter();
  const isCover = chapter.start === 1;
  chapterKicker.textContent = isCover ? "روی جلد" : `فصل ${chapter.number}`;
  chapterTitle.textContent = chapter.title;
  document.title = `${chapter.title} — جزوه زیست‌شناسی یازدهم`;

  chapterList.querySelectorAll(".chapter-link").forEach((button) => {
    const target = Number(button.dataset.page);
    const item = chapters.find((chapterItem) => chapterItem.start === target);
    const selected = item === chapter;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-current", selected ? "page" : "false");
  });
}

function updatePageUI() {
  pageInput.value = currentPage;
  captionPage.textContent = persianDigits.format(currentPage);
  pageImage.alt = `صفحه ${persianDigits.format(currentPage)} از جزوه زیست‌شناسی پایه یازدهم`;
  prevPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === TOTAL_PAGES;
  readingProgress.style.width = `${(currentPage / TOTAL_PAGES) * 100}%`;
  updateChapterUI();
}

function prefetch(page) {
  if (page < 1 || page > TOTAL_PAGES) return;
  const image = new Image();
  image.src = pagePath(page);
}

function goToPage(page, options = {}) {
  const safePage = Math.max(1, Math.min(TOTAL_PAGES, Math.round(Number(page) || 1)));
  if (safePage === currentPage && !options.force) return;

  currentPage = safePage;
  pageSheet.classList.add("is-loading");
  loading.hidden = false;
  pageImage.src = pagePath(currentPage);
  updatePageUI();

  const hash = `#page=${currentPage}`;
  if (options.replaceHistory) {
    history.replaceState({ page: currentPage }, "", hash);
  } else {
    history.pushState({ page: currentPage }, "", hash);
  }

  pageStage.scrollTo({ top: 0, left: 0, behavior: options.instant ? "auto" : "smooth" });
  prefetch(currentPage + 1);
  prefetch(currentPage - 1);
}

function applyZoom(nextZoom) {
  zoom = Math.max(0.8, Math.min(1.8, Number(nextZoom.toFixed(2))));
  if (zoom === 1) {
    pageSheet.style.width = "min(100%, 960px)";
    pageSheet.style.maxWidth = "960px";
  } else {
    pageSheet.style.width = `${Math.round(100 * zoom)}%`;
    pageSheet.style.maxWidth = `${Math.round(960 * zoom)}px`;
  }
  document.querySelector("#zoomOut").disabled = zoom <= 0.8;
  document.querySelector("#zoomIn").disabled = zoom >= 1.8;
}

function openSidebar() {
  sidebar.classList.add("is-open");
  scrim.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  scrim.hidden = true;
  document.body.style.overflow = "";
}

pageImage.addEventListener("load", () => {
  pageSheet.classList.remove("is-loading");
  loading.hidden = true;
});

pageImage.addEventListener("error", () => {
  pageSheet.classList.remove("is-loading");
  loading.hidden = true;
  pageImage.alt = `نمایش صفحه ${persianDigits.format(currentPage)} ممکن نشد. نسخه PDF از فهرست در دسترس است.`;
});

prevPage.addEventListener("click", () => goToPage(currentPage - 1));
nextPage.addEventListener("click", () => goToPage(currentPage + 1));

pageInput.addEventListener("change", () => goToPage(pageInput.value));
pageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    goToPage(pageInput.value);
    pageInput.blur();
  }
});

document.querySelector("#zoomOut").addEventListener("click", () => applyZoom(zoom - 0.2));
document.querySelector("#zoomIn").addEventListener("click", () => applyZoom(zoom + 0.2));
document.querySelector("#fitPage").addEventListener("click", () => applyZoom(1));
document.querySelector("#openSidebar").addEventListener("click", openSidebar);
document.querySelector("#closeSidebar").addEventListener("click", closeSidebar);
scrim.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input")) return;
  if (event.key === "ArrowLeft") goToPage(currentPage + 1);
  if (event.key === "ArrowRight") goToPage(currentPage - 1);
  if (event.key === "Escape") closeSidebar();
});

pageStage.addEventListener("pointerdown", (event) => {
  pointerStartX = event.clientX;
});

pageStage.addEventListener("pointerup", (event) => {
  if (pointerStartX === null || zoom !== 1) return;
  const distance = event.clientX - pointerStartX;
  pointerStartX = null;
  if (Math.abs(distance) < 70) return;
  if (distance < 0) goToPage(currentPage + 1);
  if (distance > 0) goToPage(currentPage - 1);
});

window.addEventListener("popstate", () => {
  const match = location.hash.match(/page=(\d+)/);
  goToPage(match ? Number(match[1]) : 1, { replaceHistory: true, instant: true, force: true });
});

renderChapters();
const initialPage = Number(location.hash.match(/page=(\d+)/)?.[1] || 1);
currentPage = Math.max(1, Math.min(TOTAL_PAGES, initialPage));
pageImage.src = pagePath(currentPage);
updatePageUI();
history.replaceState({ page: currentPage }, "", `#page=${currentPage}`);
prefetch(currentPage + 1);
