    /* ══✿══╡°˖✧᯽ CONFIG ᯽✧˖°╞══✿══*/

const API_BASE = "/api/courses";

    /* ══✿══╡°˖✧᯽   ELEMENTS   ᯽✧˖°╞══✿══*/

const coursesGrid = document.querySelector(".courses-grid");

const courseCover = document.getElementById("courseCover");
const courseTitle = document.getElementById("courseTitle");
const courseDescription = document.getElementById("courseDescription");
const teacherPhoto = document.getElementById("teacherPhoto");
const teacherName = document.getElementById("teacherName");

const chaptersGrid = document.getElementById("chaptersGrid");
const reviewsList = document.getElementById("reviewsList");


function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

    /* ══✿══╡°˖✧᯽  LOADS COURSE LIST (GRID)  ᯽✧˖°╞══✿══*/

async function loadCourses() {
  if (!coursesGrid) return;

  try {
    const res = await fetch(API_BASE);
    const courses = await res.json();

    coursesGrid.innerHTML = "";

    courses.forEach(course => {
      const card = document.createElement("div");
      card.className = "course-card";
      card.dataset.id = course.id;

      card.innerHTML = `
        <img src="${course.cover}" alt="">
        <h4>${course.title}</h4>
        <p class="duration">Duration: ${course.duration}</p>
        <p class="teacher">Teacher: ${course.teacher.name}</p>
      `;

      card.addEventListener("click", () => {
        window.location.href = `course.html?id=${course.id}`;
      });

      coursesGrid.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load courses", err);
  }
}

    /* ══✿══╡°˖✧᯽   LOAD SINGLE COURSE DETAIL   ᯽✧˖°╞══✿══*/

async function loadCourseDetail() {
  const courseId = getQueryParam("id");
  if (!courseId) return;

  try {
    const res = await fetch(`${API_BASE}/${courseId}`);
    if (!res.ok) throw new Error("Course not found");

    const course = await res.json();
    renderCourse(course);
  } catch (err) {
    console.error(err);
  }
}

    /* ══✿══╡°˖✧᯽  RENDER COURSE PAGE   ᯽✧˖°╞══✿══*/

function renderCourse(course) {
  if (courseCover) courseCover.src = course.cover;
  if (courseTitle) courseTitle.textContent = course.title;
  if (courseDescription) courseDescription.textContent = course.description;

  if (teacherPhoto) teacherPhoto.src = course.teacher.photo;
  if (teacherName) teacherName.textContent = course.teacher.name;

  renderChapters(course.chapters);
  renderReviews(course.reviews);
}

    /* ══✿══╡°˖✧᯽   RENDER CHAPTERS   ᯽✧˖°╞══✿══*/

function renderChapters(chapters = []) {
  if (!chaptersGrid) return;

  chaptersGrid.innerHTML = "";

  chapters.forEach(chap => {
    const card = document.createElement("div");
    card.className = "chapter-card";

    card.innerHTML = `
      <img src="${chap.cover}" alt="">
      <div>
        <h4>${chap.title}</h4>
        <p>${chap.duration}</p>
        ${
          chap.preview
            ? '<span class="badge">Preview</span>'
            : '<span class="lock">🔒</span>'
        }
      </div>
    `;

    card.addEventListener("click", () => {
      if (chap.preview && chap.video) {
        window.open(chap.video, "_blank");
      } else {
        alert("This chapter is locked.");
      }
    });

    chaptersGrid.appendChild(card);
  });
}

    /* ══✿══╡°˖✧᯽  RENDER REVIEWS  ᯽✧˖°╞══✿══*/

function renderReviews(reviews = []) {
  if (!reviewsList) return;

  reviewsList.innerHTML = reviews
    .map(
      r => `
      <div class="review-card">
        <strong>${r.name}</strong>
        <span class="stars">
          ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}
        </span>
        <p>${r.comment}</p>
      </div>
    `
    )
    .join("");
}


document.addEventListener("DOMContentLoaded", () => {
  loadCourses();
  loadCourseDetail();
});
