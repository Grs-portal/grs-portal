const API_BASE = "/api/courses";
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const getQueryParam = key =>
  new URLSearchParams(window.location.search).get(key);

const elements = {
  courseCover: $("#courseCover"),
  courseTitle: $("#courseTitle"),
  courseDescription: $("#courseDescription"),
  teacherPhoto: $("#teacherPhoto"),
  teacherName: $("#teacherName"),
  courseTypeBadge: $("#courseTypeBadge"),
  courseInfo: $(".course-info"),
  chaptersGrid: $("#chaptersGrid"),
  reviewsList: $("#reviewsList"),

  editCourseBtn: null,
  editCourseModal: $("#editCourseModal"),
  editCourseForm: $("#editCourseForm"),

  chapterModal: $("#chapterModal"),
  chapterForm: $("#chapterForm"),
  chapterModalTitle: $("#chapterModalTitle"),

  videoModal: $("#videoModal"),
  videoWrapper: $("#videoWrapper"),
};

  // ══✿══╡°˖✧᯽  FETCH COURSE DATA ᯽✧˖°╞══✿══

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

  // ══✿══╡°˖✧᯽  RENDER COURSE INFO ᯽✧˖°╞══✿══

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
    elements.courseTypeBadge.textContent = course.courseType.toUpperCase();
    elements.courseTypeBadge.className = `course-badge ${course.courseType}`;
  }

  renderCourseInfo(course);
  renderChapters(course.chapters);
  renderReviews(course.reviews);
}

  // ══✿══╡°˖✧᯽  COURSE INFO BLOCKS  ᯽✧˖°╞══✿══

function renderCourseInfo(course) {
  if (!elements.courseInfo) return;
  elements.courseInfo.innerHTML = `
    <div class="info-block">
      <span class="number">${course.duration}</span>
      <span class="label">Duration</span>
    </div>
    <div class="info-block">
      <span class="number">${course.chapters?.length ?? 0}</span>
      <span class="label">Chapters</span>
    </div>
    <div class="info-block-location">
      <span class="tag">${course.category ?? "N/A"}</span>
    </div>
  `;
}

  // ══✿══╡°˖✧᯽ RENDER CHAPTERS ᯽✧˖°╞══✿══

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
        <div class="chapter-actions">
          <button class="edit-chapter">Edit</button>
          <button class="delete-chapter">Delete</button>
        </div>
      </div>
    `;

    // Open video/pdf modal
    card.querySelector("img, h4").addEventListener("click", () => {
      if (chapter.video) openVideoModal(chapter.video);
      else alert("This chapter is locked.");
    });

    // Edit chapter
    card.querySelector(".edit-chapter").addEventListener("click", () => {
      openChapterModal(chapter);
    });

    // Delete chapter
    card.querySelector(".delete-chapter").addEventListener("click", async () => {
      if (!confirm("Delete this chapter?")) return;
      try {
        await fetch(`${API_BASE}/${getQueryParam("id")}/chapters/${chapter.id}`, {
          method: "DELETE"
        });
        loadCourseDetail();
      } catch (err) {
        console.error("Failed to delete chapter:", err);
      }
    });

    elements.chaptersGrid.appendChild(card);
  });
}

  // ══✿══╡°˖✧᯽  RENDER REVIEWS ᯽✧˖°╞══✿══

function renderReviews(reviews = []) {
  if (!elements.reviewsList) return;

  // Calculate average
  const total = reviews.length;
  const avg =
    total === 0
      ? 0
      : (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1);

  $("#averageRating").textContent = avg;
  $("#totalReviews").textContent = `(${total} reviews)`;
  $("#ratingStars").textContent =
    "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));

  elements.reviewsList.innerHTML = "";

  reviews.forEach(review => {
    const card = document.createElement("div");
    card.className = "review-card";

    card.innerHTML = `
      <strong>${review.name}</strong>
      <div>${"★".repeat(review.rating)}${"☆".repeat(
      5 - review.rating
    )}</div>
      <p>${review.comment}</p>

      ${
        review.reply
          ? `<div class="reply-box"><strong>Teacher Reply:</strong><p>${review.reply}</p></div>`
          : ""
      }

      <div class="review-actions">
        <button class="reply-review">Reply</button>
        <button class="delete-review">Delete</button>
      </div>
    `;

    // Reply button
    card.querySelector(".reply-review").addEventListener("click", () => {
      const reply = prompt("Enter your reply:");
      if (!reply) return;

      fetch(`${API_BASE}/${getQueryParam("id")}/reviews/${review.id}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply })
      }).then(loadCourseDetail);
    });

    // Delete button
    card.querySelector(".delete-review").addEventListener("click", () => {
      if (!confirm("Delete this review?")) return;

      fetch(`${API_BASE}/${getQueryParam("id")}/reviews/${review.id}`, {
        method: "DELETE"
      }).then(loadCourseDetail);
    });

    elements.reviewsList.appendChild(card);
  });
}


  // ══✿══╡°˖✧᯽ MODAL LOGIC ᯽✧˖°╞══✿══

function openModal(modal) { modal.classList.add("active"); }
function closeModal(modal) { modal.classList.remove("active"); }

$$("[data-close-modal]").forEach(btn =>
  btn.addEventListener("click", e => closeModal(e.target.closest(".course-modal")))
);

  // ══✿══╡°˖✧᯽ COURSE EDIT ᯽✧˖°╞══✿══

function openEditCourseModal(course) {
  if (!elements.editCourseModal || !elements.editCourseForm) return;
  const form = elements.editCourseForm;
  form.title.value = course.title;
  form.description.value = course.description;
  form.cover.value = course.cover;
  form.courseType.value = course.courseType;
  form.duration.value = course.duration;
  form.category.value = course.category ?? "";
  openModal(elements.editCourseModal);
}

elements.editCourseForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const courseId = getQueryParam("id");
  const form = e.target;
  const data = {
    title: form.title.value,
    description: form.description.value,
    cover: form.cover.value,
    courseType: form.courseType.value,
    duration: form.duration.value,
    category: form.category.value
  };

  try {
    await fetch(`${API_BASE}/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    closeModal(elements.editCourseModal);
    loadCourseDetail();
  } catch (err) {
    console.error("Failed to update course:", err);
  }
});


document.addEventListener("DOMContentLoaded", () => {
  loadCourseDetail();

  // Set button elements
  elements.editCourseBtn = $("#editCourseBtn");
  elements.addChapterBtn = $("#addChapterBtn");

  // Open edit course modal
  elements.editCourseBtn?.addEventListener("click", async () => {
    const courseId = getQueryParam("id");
    try {
      const res = await fetch(`${API_BASE}/${courseId}`);
      const course = await res.json();
      openEditCourseModal(course);
    } catch (err) {
      console.error("Failed to load course for editing:", err);
    }
  });

  // Open add chapter modal
  elements.addChapterBtn?.addEventListener("click", () => {
    openChapterModal(); // no argument = add new chapter
  });
});


  // ══✿══╡°˖✧᯽  CHAPTER MODAL ᯽✧˖°╞══✿══

function openChapterModal(chapter = null) {
  if (!elements.chapterModal || !elements.chapterForm) return;
  const form = elements.chapterForm;
  if (chapter) {
    elements.chapterModalTitle.textContent = "Edit Chapter";
    form.title.value = chapter.title;
    form.cover.value = chapter.cover;
    form.video.value = chapter.video ?? "";
    form.duration.value = chapter.duration;
    form.preview.checked = chapter.preview;
    form.chapterId.value = chapter.id;
  } else {
    elements.chapterModalTitle.textContent = "Add Chapter";
    form.reset();
  }
  openModal(elements.chapterModal);
}

elements.chapterForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const courseId = getQueryParam("id");
  const form = e.target;
  const chapterId = form.chapterId.value;
  const data = {
    title: form.title.value,
    cover: form.cover.value,
    video: form.video.value,
    duration: form.duration.value,
    preview: form.preview.checked
  };

  try {
    if (chapterId) {
      await fetch(`${API_BASE}/${courseId}/chapters/${chapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } else {
      await fetch(`${API_BASE}/${courseId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    }
    closeModal(elements.chapterModal);
    loadCourseDetail();
  } catch (err) {
    console.error("Failed to save chapter:", err);
  }
});

  // ══✿══╡°˖✧᯽  VIDEO/PDF MODAL ᯽✧˖°╞══✿══

function openVideoModal(url) {
  if (!elements.videoModal || !elements.videoWrapper) return;
  elements.videoWrapper.innerHTML = `
    ${url.endsWith(".pdf")
      ? `<iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>`
      : `<video src="${url}" controls autoplay></video>`}`;
  openModal(elements.videoModal);
}

  // ══✿══╡°˖✧᯽  INIT ᯽✧˖°╞══✿══

document.addEventListener("DOMContentLoaded", () => {
  loadCourseDetail();
});


async function loadCourses() {
  try {
    const res = await fetch(API_BASE);
    const courses = await res.json();

    const grid = document.getElementById("coursesGrid");
    if (!grid) return;

    grid.innerHTML = courses.map(course => `
      <div class="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        <img src="${course.cover}" class="w-full h-40 object-cover rounded-lg mb-3">
        <h3 class="text-lg font-semibold">${course.title}</h3>
        <p class="text-sm text-gray-600 mb-2">${course.description}</p>
        <a href="course.html?id=${course.id}" 
           class="inline-block mt-2 text-green-600 font-medium hover:underline">
           View Course →
        </a>
      </div>
    `).join("");

  } catch (err) {
    console.error("Failed to load courses:", err);
  }
}

