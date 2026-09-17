const TOTAL_PAGES = 271;
const ANNOTATION_STORAGE_KEY = "biology-11-annotations-v1";

const chapters = [
  { number: "آغاز", title: "روی جلد و راهنمای مطالعه", start: 1, end: 1 },
  { number: "۱", title: "تنظیم عصبی", start: 2, end: 30, pdf: "chapter-01.pdf" },
  { number: "۲", title: "حواس", start: 31, end: 64, pdf: "chapter-02.pdf" },
  { number: "۳", title: "دستگاه حرکتی", start: 65, end: 91, pdf: "chapter-03.pdf" },
  { number: "۴", title: "تنظیم شیمیایی", start: 92, end: 111, pdf: "chapter-04.pdf" },
  { number: "۵", title: "ایمنی", start: 112, end: 144, pdf: "chapter-05.pdf" },
  { number: "۶", title: "تقسیم یاخته", start: 145, end: 174, pdf: "chapter-06.pdf" },
  { number: "۷", title: "تولید مثل", start: 175, end: 219, pdf: "chapter-07.pdf" },
  { number: "۸", title: "تولید مثل در نهان‌دانگان", start: 220, end: 247, pdf: "chapter-08.pdf" },
  { number: "۹", title: "پاسخ گیاهان به محرک‌ها", start: 248, end: 271, pdf: "chapter-09.pdf" },
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
const whiteboardToggle = document.querySelector("#whiteboardToggle");
const whiteboardToolbar = document.querySelector("#whiteboardToolbar");
const closeWhiteboardButton = document.querySelector("#closeWhiteboard");
const fullscreenToggle = document.querySelector("#fullscreenToggle");
const fullscreenLabel = fullscreenToggle.querySelector(".tool-launch__label");
const annotationCanvas = document.querySelector("#annotationCanvas");
const pageCanvasWrap = document.querySelector("#pageCanvasWrap");
const strokeWidth = document.querySelector("#strokeWidth");
const undoDrawing = document.querySelector("#undoDrawing");
const clearDrawing = document.querySelector("#clearDrawing");

let currentPage = 1;
let zoom = 1;
let pointerStartX = null;
let whiteboardActive = false;
let drawingTool = "pen";
let drawingColor = "#e52f42";
let currentStroke = null;
let annotations = loadStoredAnnotations();

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
        <div class="chapter-item" data-start="${chapter.start}">
          <button class="chapter-link" type="button" data-page="${chapter.start}" aria-label="رفتن به ${chapter.title}">
            <span class="chapter-link__number">${chapter.number}</span>
            <span class="chapter-link__copy">
              <strong>${chapter.title}</strong>
              <small>صفحه ${persianDigits.format(chapter.start)}${chapter.end > chapter.start ? ` تا ${persianDigits.format(chapter.end)}` : ""}</small>
            </span>
            <span class="chapter-link__arrow" aria-hidden="true">←</span>
          </button>
          ${
            chapter.pdf
              ? `<a class="chapter-download" href="${chapter.pdf}" download aria-label="دانلود فصل ${chapter.number}: ${chapter.title}" title="دانلود PDF فصل"><span aria-hidden="true">↓</span><span>PDF</span></a>`
              : ""
          }
        </div>`,
    )
    .join("");

  chapterList.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(Number(button.dataset.page));
      closeSidebar();
    });
  });

  chapterList.querySelectorAll(".chapter-download").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 980) closeSidebar();
    });
  });
}

function updateChapterUI() {
  const chapter = activeChapter();
  const isCover = chapter.start === 1;
  chapterKicker.textContent = isCover ? "روی جلد" : `فصل ${chapter.number}`;
  chapterTitle.textContent = chapter.title;
  document.title = `${chapter.title} — جزوه زیست‌شناسی یازدهم`;

  chapterList.querySelectorAll(".chapter-item").forEach((item) => {
    const selected = Number(item.dataset.start) === chapter.start;
    item.classList.toggle("is-active", selected);
    item.querySelector(".chapter-link").setAttribute("aria-current", selected ? "page" : "false");
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
  currentStroke = null;
  requestAnimationFrame(resizeAnnotationCanvas);
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
  if (options.replaceHistory) history.replaceState({ page: currentPage }, "", hash);
  else history.pushState({ page: currentPage }, "", hash);

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
  requestAnimationFrame(resizeAnnotationCanvas);
}

function openSidebar() {
  sidebar.classList.add("is-open");
  scrim.hidden = false;
  document.body.classList.add("sidebar-open");
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  scrim.hidden = true;
  document.body.classList.remove("sidebar-open");
}

function loadStoredAnnotations() {
  try {
    return JSON.parse(localStorage.getItem(ANNOTATION_STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function persistAnnotations() {
  try {
    localStorage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(annotations));
  } catch {
    // Keep the current-session drawing if browser storage is unavailable.
  }
}

function pageStrokes() {
  return annotations[String(currentPage)] || [];
}

function canvasPoint(event) {
  const rect = annotationCanvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

function toolWidth(stroke) {
  if (stroke.tool === "marker") return Math.max(8, stroke.width * 1.7);
  if (stroke.tool === "highlighter") return Math.max(18, stroke.width * 3.5);
  if (stroke.tool === "eraser") return Math.max(22, stroke.width * 3.6);
  return stroke.width;
}

function drawStroke(context, stroke) {
  if (!stroke?.points?.length) return;
  const rect = annotationCanvas.getBoundingClientRect();
  const dpr = annotationCanvas.width / Math.max(1, rect.width);
  const points = stroke.points;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = toolWidth(stroke) * dpr;
  context.strokeStyle = stroke.color;
  context.globalAlpha = stroke.tool === "highlighter" ? 0.28 : stroke.tool === "marker" ? 0.92 : 1;
  context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  context.beginPath();

  const first = points[0];
  context.moveTo(first.x * annotationCanvas.width, first.y * annotationCanvas.height);

  if (stroke.tool === "line") {
    const last = points[points.length - 1];
    context.lineTo(last.x * annotationCanvas.width, last.y * annotationCanvas.height);
  } else if (points.length === 1) {
    context.lineTo(first.x * annotationCanvas.width + 0.1, first.y * annotationCanvas.height + 0.1);
  } else {
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      context.lineTo(point.x * annotationCanvas.width, point.y * annotationCanvas.height);
    }
  }

  context.stroke();
  context.restore();
}

function redrawAnnotations() {
  const context = annotationCanvas.getContext("2d");
  context.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
  pageStrokes().forEach((stroke) => drawStroke(context, stroke));
  if (currentStroke) drawStroke(context, currentStroke);
  undoDrawing.disabled = pageStrokes().length === 0;
  clearDrawing.disabled = pageStrokes().length === 0;
}

function resizeAnnotationCanvas() {
  const rect = pageCanvasWrap.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.round(rect.width * dpr);
  const nextHeight = Math.round(rect.height * dpr);
  if (annotationCanvas.width !== nextWidth || annotationCanvas.height !== nextHeight) {
    annotationCanvas.width = nextWidth;
    annotationCanvas.height = nextHeight;
  }
  redrawAnnotations();
}

function setWhiteboard(active) {
  whiteboardActive = Boolean(active);
  document.body.classList.toggle("whiteboard-active", whiteboardActive);
  whiteboardToolbar.hidden = !whiteboardActive;
  whiteboardToggle.setAttribute("aria-pressed", String(whiteboardActive));
  whiteboardToggle.classList.toggle("is-active", whiteboardActive);
  if (whiteboardActive) requestAnimationFrame(resizeAnnotationCanvas);
}

function selectDrawingTool(tool) {
  drawingTool = tool;
  document.querySelectorAll(".drawing-tool").forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  annotationCanvas.dataset.tool = tool;
}

function beginDrawing(event) {
  if (!whiteboardActive || drawingTool === "pan" || event.button > 0) return;
  event.preventDefault();
  annotationCanvas.setPointerCapture(event.pointerId);
  const point = canvasPoint(event);
  currentStroke = {
    tool: drawingTool,
    color: drawingColor,
    width: Number(strokeWidth.value),
    points: [point],
  };
  if (drawingTool === "line") currentStroke.points.push(point);
  redrawAnnotations();
}

function continueDrawing(event) {
  if (!currentStroke || !annotationCanvas.hasPointerCapture(event.pointerId)) return;
  event.preventDefault();
  const point = canvasPoint(event);
  if (currentStroke.tool === "line") currentStroke.points[1] = point;
  else currentStroke.points.push(point);
  redrawAnnotations();
}

function finishDrawing(event) {
  if (!currentStroke) return;
  event.preventDefault();
  if (annotationCanvas.hasPointerCapture(event.pointerId)) annotationCanvas.releasePointerCapture(event.pointerId);
  const key = String(currentPage);
  annotations[key] = [...pageStrokes(), currentStroke];
  currentStroke = null;
  persistAnnotations();
  redrawAnnotations();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    document.body.classList.toggle("presentation-mode");
    syncFullscreenUI();
  }
}

function syncFullscreenUI() {
  const active = Boolean(document.fullscreenElement) || document.body.classList.contains("presentation-mode");
  document.body.classList.toggle("is-fullscreen", active);
  fullscreenToggle.setAttribute("aria-pressed", String(active));
  fullscreenToggle.setAttribute("aria-label", active ? "خروج از تمام‌صفحه" : "نمایش تمام‌صفحه");
  fullscreenLabel.textContent = active ? "خروج" : "تمام‌صفحه";
  requestAnimationFrame(resizeAnnotationCanvas);
}

pageImage.addEventListener("load", () => {
  pageSheet.classList.remove("is-loading");
  loading.hidden = true;
  resizeAnnotationCanvas();
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

whiteboardToggle.addEventListener("click", () => setWhiteboard(!whiteboardActive));
closeWhiteboardButton.addEventListener("click", () => setWhiteboard(false));
fullscreenToggle.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", syncFullscreenUI);

document.querySelectorAll(".drawing-tool").forEach((button) => {
  button.addEventListener("click", () => selectDrawingTool(button.dataset.tool));
});

document.querySelectorAll(".color-swatch").forEach((button) => {
  button.addEventListener("click", () => {
    drawingColor = button.dataset.color;
    document.querySelectorAll(".color-swatch").forEach((swatch) => {
      const selected = swatch === button;
      swatch.classList.toggle("is-active", selected);
      swatch.setAttribute("aria-pressed", String(selected));
    });
  });
});

undoDrawing.addEventListener("click", () => {
  const key = String(currentPage);
  const strokes = pageStrokes();
  if (!strokes.length) return;
  annotations[key] = strokes.slice(0, -1);
  if (!annotations[key].length) delete annotations[key];
  persistAnnotations();
  redrawAnnotations();
});

clearDrawing.addEventListener("click", () => {
  delete annotations[String(currentPage)];
  currentStroke = null;
  persistAnnotations();
  redrawAnnotations();
});

annotationCanvas.addEventListener("pointerdown", beginDrawing);
annotationCanvas.addEventListener("pointermove", continueDrawing);
annotationCanvas.addEventListener("pointerup", finishDrawing);
annotationCanvas.addEventListener("pointercancel", () => {
  currentStroke = null;
  redrawAnnotations();
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea, select")) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && whiteboardActive) {
    event.preventDefault();
    undoDrawing.click();
    return;
  }
  if (event.key === "ArrowLeft" && !whiteboardActive) goToPage(currentPage + 1);
  if (event.key === "ArrowRight" && !whiteboardActive) goToPage(currentPage - 1);
  if (event.key === "Escape") {
    if (whiteboardActive) setWhiteboard(false);
    else closeSidebar();
  }
});

pageStage.addEventListener("pointerdown", (event) => {
  if (whiteboardActive || event.target === annotationCanvas) return;
  pointerStartX = event.clientX;
});

pageStage.addEventListener("pointerup", (event) => {
  if (whiteboardActive || pointerStartX === null || zoom !== 1) return;
  const distance = event.clientX - pointerStartX;
  pointerStartX = null;
  if (Math.abs(distance) < 70) return;
  if (distance < 0) goToPage(currentPage + 1);
  if (distance > 0) goToPage(currentPage - 1);
});

pageStage.addEventListener("pointercancel", () => {
  pointerStartX = null;
});

window.addEventListener("popstate", () => {
  const match = location.hash.match(/page=(\d+)/);
  goToPage(match ? Number(match[1]) : 1, { replaceHistory: true, instant: true, force: true });
});

new ResizeObserver(resizeAnnotationCanvas).observe(pageCanvasWrap);

renderChapters();
const initialPage = Number(location.hash.match(/page=(\d+)/)?.[1] || 1);
currentPage = Math.max(1, Math.min(TOTAL_PAGES, initialPage));
pageImage.src = pagePath(currentPage);
updatePageUI();
selectDrawingTool("pen");
history.replaceState({ page: currentPage }, "", `#page=${currentPage}`);
prefetch(currentPage + 1);
