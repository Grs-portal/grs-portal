document.addEventListener("DOMContentLoaded", () => {

  const API = "/api";
  const COURSE_API = "/api/courses";

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];

  /* ===============================
     ROUTER
  =============================== */

  function showPage(id) {
    qsa(".page-section").forEach(p => p.classList.add("hidden"));
    qs(`#${id}`)?.classList.remove("hidden");

    if (id === "my-courses") loadCourses();
  }

  /* ===============================
     LOAD COURSES (GRID)
  =============================== */

  async function loadCourses() {
    const grid = qs("#coursesGrid");
    if (!grid) return;

    grid.innerHTML = "Loading courses...";

    try {
      const res = await fetch(COURSE_API);
      const courses = await res.json();

      if (!courses.length) {
        grid.innerHTML = "<p>No courses created yet.</p>";
        return;
      }

      grid.innerHTML = "";

      courses.forEach(course => {
        const card = document.createElement("div");
        card.className =
          "bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden";

        card.innerHTML = `
          <img src="${course.cover || '/placeholder.jpg'}"
               class="w-full h-40 object-cover">
          <div class="p-4">
            <h3 class="font-bold text-lg">${course.title}</h3>
            <p class="text-sm opacity-70 mt-2 line-clamp-2">
              ${course.description || ""}
            </p>
            <button class="viewCourse mt-4 px-3 py-1 bg-black text-white rounded">
              View Course
            </button>
          </div>
        `;

        card.querySelector(".viewCourse")
          .addEventListener("click", () => openCourseDetail(course.id));

        grid.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      grid.innerHTML = "Failed to load courses.";
    }
  }

  /* ===============================
     OPEN COURSE DETAIL
  =============================== */

  async function openCourseDetail(courseId) {
    showPage("course-detail");

    const container = qs("#courseDetailContainer");
    container.innerHTML = "Loading course...";

    try {
      const res = await fetch(`${COURSE_API}/${courseId}`);
      const course = await res.json();

      container.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">

          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-2xl font-bold">${course.title}</h2>
              <p class="opacity-70 mt-2">${course.description || ""}</p>
            </div>

            <button id="addChapterBtn"
              class="px-4 py-2 bg-black text-white rounded">
              + Add Chapter
            </button>
          </div>

          <hr class="my-6">

          <div id="chaptersContainer"></div>
        </div>
      `;

      renderChapters(course, courseId);

      qs("#addChapterBtn")
        .addEventListener("click", () => openAddChapterModal(courseId));

    } catch (err) {
      console.error(err);
      container.innerHTML = "Failed to load course.";
    }
  }

  /* ===============================
     RENDER CHAPTERS
  =============================== */

  function renderChapters(course, courseId) {
    const container = qs("#chaptersContainer");

    if (!course.chapters || !course.chapters.length) {
      container.innerHTML = "<p>No chapters yet.</p>";
      return;
    }

    container.innerHTML = "";

    course.chapters.forEach((chapter, index) => {
      const div = document.createElement("div");
      div.className = "mb-4 p-4 border rounded-lg";

      let fileLink = chapter.file ? `<a href="${chapter.file}" target="_blank" class="text-blue-600 underline">View File</a>` : '';
      let mediaPreview = '';
      if (chapter.cover && chapter.cover.endsWith(".mp4")) {
        mediaPreview = `<video src="${chapter.cover}" controls class="w-full mt-2 rounded"></video>`;
      } else if (chapter.cover) {
        mediaPreview = `<img src="${chapter.cover}" class="w-full mt-2 object-cover rounded">`;
      }

      div.innerHTML = `
        <div class="flex justify-between items-center">
          <h4 class="font-bold">
            ${index + 1}. ${chapter.title}
          </h4>
          <button class="deleteChapter text-red-500 text-sm">
            Delete
          </button>
        </div>
        <p class="mt-2 opacity-70">${chapter.content}</p>
        ${fileLink}
        ${mediaPreview}
      `;

      div.querySelector(".deleteChapter")
        .addEventListener("click", async () => {
          await deleteChapter(courseId, index);
        });

      container.appendChild(div);
    });
  }

  /* ===============================
     DELETE CHAPTER
  =============================== */

  async function deleteChapter(courseId, index) {
    try {
      await fetch(`${COURSE_API}/${courseId}/chapters/${index}`, {
        method: "DELETE"
      });
      openCourseDetail(courseId);
    } catch (err) {
      console.error(err);
      alert("Failed to delete chapter.");
    }
  }

  /* ===============================
     ADD CHAPTER MODAL
  =============================== */

  function openAddChapterModal(courseId) {

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black/40 flex items-center justify-center z-50";

    modal.innerHTML = `
      <div class="bg-white p-6 rounded-xl w-[90%] max-w-md">
        <h3 class="font-bold text-lg mb-4">Add Chapter</h3>

        <input id="chapterTitle"
          placeholder="Chapter title"
          class="w-full border p-2 mb-3 rounded">

        <textarea id="chapterContent"
          placeholder="Chapter content"
          class="w-full border p-2 mb-3 rounded"></textarea>

        <input id="chapterFile"
          type="file"
          class="w-full mb-3">

        <input id="chapterCover"
          type="text"
          placeholder="Cover URL or video link"
          class="w-full border p-2 mb-3 rounded">

        <input id="chapterLink"
          type="text"
          placeholder="Optional external link"
          class="w-full border p-2 mb-3 rounded">

        <div class="flex justify-end gap-3">
          <button id="cancelModal"
            class="px-3 py-1 border rounded">
            Cancel
          </button>
          <button id="saveChapter"
            class="px-3 py-1 bg-black text-white rounded">
            Save
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    qs("#cancelModal").onclick = () => modal.remove();

    qs("#saveChapter").onclick = async () => {
      const title = qs("#chapterTitle").value.trim();
      const content = qs("#chapterContent").value.trim();
      const cover = qs("#chapterCover").value.trim();
      const link = qs("#chapterLink").value.trim();
      const fileInput = qs("#chapterFile");

      if (!title || !content) {
        alert("Please fill out both title and content.");
        return;
      }

      // Optional file handling: convert to Base64 if needed, or upload separately
      let fileUrl = "";
      if (fileInput.files.length) {
        const file = fileInput.files[0];
        // TODO: implement backend upload here; for now we simulate a file URL
        fileUrl = URL.createObjectURL(file);
      }

      try {
        await fetch(`${COURSE_API}/${courseId}/chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, cover, file: fileUrl, link })
        });

        modal.remove();
        openCourseDetail(courseId);
      } catch (err) {
        console.error(err);
        alert("Failed to add chapter.");
      }
    };
  }

  /* ===============================
     BACK BUTTON
  =============================== */

  qs("#backToCourses")?.addEventListener("click", () => {
    showPage("my-courses");
  });

  /* ===============================
     INIT
  =============================== */

  showPage("dashboard");

});
