/* ══✿══╡°˖✧᯽ CONFIG ᯽✧˖°╞══✿══ */
const API_BASE = "/api/courses";

/* ══✿══╡°˖✧᯽ HELPERS ᯽✧˖°╞══✿══ */
const $ = selector => document.querySelector(selector);

const getQueryParam = key =>
  new URLSearchParams(window.location.search).get(key);

/* ══✿══╡°˖✧᯽ ELEMENTS ᯽✧˖°╞══✿══ */
const elements = {
  coursesGrid: $(".courses-grid"),

  courseCover: $("#courseCover"),
  courseTitle: $("#courseTitle"),
  courseDescription: $("#courseDescription"),

  teacherPhoto: $("#teacherPhoto"),
  teacherName: $("#teacherName"),

  courseTypeBadge: $("#courseTypeBadge"),

  chaptersGrid: $("#chaptersGrid"),
  reviewsList: $("#reviewsList"),
};

/* ══✿══╡°˖✧᯽ LOAD COURSES GRID ᯽✧˖°╞══✿══ */
async function loadCourses() {
  if (!elements.coursesGrid) return;

  try {
    const res = await fetch(API_BASE);
    const courses = await res.json();

    elements.coursesGrid.innerHTML = "";

    courses.forEach(course => {
      const card = document.createElement("div");
      card.className = "course-card";

      card.innerHTML = `
        <img src="${course.cover}" alt="">
        <h4>${course.title}</h4>

        <span class="course-badge ${course.courseType}">
          ${course.courseType.toUpperCase()}
        </span>

        <p class="duration">Duration: ${course.duration}</p>
        <p class="teacher">Teacher: ${course.teacher?.name ?? "Unknown"}</p>
      `;

      card.addEventListener("click", () => {
        window.location.href = `course.html?id=${course.id}`;
      });

      elements.coursesGrid.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load courses:", err);
  }
}

/* ══✿══╡°˖✧᯽ LOAD SINGLE COURSE ᯽✧˖°╞══✿══ */
async function loadCourseDetail() {
  const courseId = getQueryParam("id");
  if (!courseId) return;

  try {
    const res = await fetch(`${API_BASE}/${courseId}`);
    if (!res.ok) throw new Error("Course not found");

    const course = await res.json();
    renderCourse(course);
  } catch (err) {
    console.error("Failed to load course:", err);
  }
}

/* ══✿══╡°˖✧᯽ RENDER COURSE PAGE ᯽✧˖°╞══✿══ */
function renderCourse(course) {
  if (elements.courseCover) elements.courseCover.src = course.cover;
  if (elements.courseTitle) elements.courseTitle.textContent = course.title;
  if (elements.courseDescription)
    elements.courseDescription.textContent = course.description;

  if (elements.teacherPhoto)
    elements.teacherPhoto.src = course.teacher?.photo ?? "";
  if (elements.teacherName)
    elements.teacherName.textContent = course.teacher?.name ?? "Unknown";

  if (elements.courseTypeBadge) {
    elements.courseTypeBadge.textContent =
      course.courseType.toUpperCase();
    elements.courseTypeBadge.className =
      `course-badge ${course.courseType}`;
  }

  renderChapters(course.chapters);
  renderReviews(course.reviews);
}

/* ══✿══╡°˖✧᯽ RENDER CHAPTERS ᯽✧˖°╞══✿══ */
function renderChapters(chapters = []) {
  if (!elements.chaptersGrid) return;

  elements.chaptersGrid.innerHTML = "";

  chapters.forEach(chapter => {
    const card = document.createElement("div");
    card.className = "chapter-card";

    card.innerHTML = `
      <img src="${chapter.cover}" alt="">
      <div>
        <h4>${chapter.title}</h4>
        <p>${chapter.duration}</p>
        ${
          chapter.preview
            ? '<span class="badge">Preview</span>'
            : '<span class="lock">🔒</span>'
        }
      </div>
    `;

    card.addEventListener("click", () => {
      if (chapter.video) {
        window.open(chapter.video, "_blank");
      } else {
        alert("This chapter is locked.");
      }
    });

    elements.chaptersGrid.appendChild(card);
  });
}

/* ══✿══╡°˖✧᯽ RENDER REVIEWS ᯽✧˖°╞══✿══ */
function renderReviews(reviews = []) {
  if (!elements.reviewsList) return;

  elements.reviewsList.innerHTML = reviews
    .map(
      review => `
        <div class="review-card">
          <strong>${review.name}</strong>
          <span class="stars">
            ${"★".repeat(review.rating)}
            ${"☆".repeat(5 - review.rating)}
          </span>
          <p>${review.comment}</p>
        </div>
      `
    )
    .join("");
}

/* ══✿══╡°˖✧᯽ INIT ᯽✧˖°╞══✿══ */
document.addEventListener("DOMContentLoaded", () => {
  loadCourses();
  loadCourseDetail();
});
