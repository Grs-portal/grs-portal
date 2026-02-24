document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     HELPERS
  ========================= */
  const qs = (s, parent = document) => parent.querySelector(s);
  const qsa = (s, parent = document) => [...parent.querySelectorAll(s)];

  const mainSidebar = qs("#mainSidebar");
  const coursesSidebar = qs("#coursesSidebar");
  const overlay = qs("#overlay");
  const menuBtn = qs("#menuBtn");
  const mainContent = qs("main.course-page");

  /* =========================
     AUTH
  ========================= */
  const LOGIN_URL = "/homepage/login.html";
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");
  if (!isLoggedIn || role !== "instructor") window.location.replace(LOGIN_URL);

  /* =========================
     SIDEBAR CONTROL
  ========================= */
  function closeAllSidebars() {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.remove("active");
    overlay.classList.add("hidden");
  }

  function openMainSidebar() {
    coursesSidebar.classList.remove("active");
    mainSidebar.classList.add("active");
    if (window.innerWidth < 1024) overlay.classList.remove("hidden");
  }

  function openCoursesSidebar() {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.add("active");
    overlay.classList.remove("hidden");
  }

  menuBtn.addEventListener("click", () => {
    if (mainSidebar.classList.contains("active")) closeAllSidebars();
    else openMainSidebar();
  });
  overlay.addEventListener("click", closeAllSidebars);

  /* =========================
     ROUTER
  ========================= */
  function showPage(id) {
    qsa(".page-section").forEach(p => p.classList.add("hidden"));

    if (id === "course-detail") {
      mainSidebar.classList.add("hidden");
      coursesSidebar.classList.add("hidden");
      mainContent.style.width = "100%";
    } else {
      mainSidebar.classList.remove("hidden");
      coursesSidebar.classList.remove("hidden");
      mainContent.style.width = "";
      if (id === "my-courses") openCoursesSidebar();
      else openMainSidebar();
    }

    const page = qs("#" + id);
    if (page) page.classList.remove("hidden");

    qsa(".nav-item").forEach(a =>
      a.classList.toggle("active", a.dataset.page === id)
    );

    if (id === "my-courses") Courses.init();
  }

  qsa(".nav-item").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  /* =========================
     COURSES SIDEBAR
  ========================= */
  function buildCoursesSidebar() {
    coursesSidebar.innerHTML = `
      <div class="courses-sidebar-content h-full overflow-y-auto">
        <button id="backDashboardBtn" class="nav-item bg-black/90 text-white rounded-xl justify-center mb-2">
          ☰ Dashboard
        </button>

        <h3 class="sidebar-title">Filter Programs</h3>
        <div class="filter-group">
          <label>Search</label>
          <input id="searchCourse" type="text" placeholder="Search programs..." />
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select id="statusFilter">
            <option value="">All</option>
            <option>Upcoming</option>
            <option>Ongoing</option>
            <option>Completed</option>
            <option>Draft</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Location</label>
          <select id="locationFilter">
            <option value="">All</option>
            <option>Online</option>
            <option>In Person</option>
            <option>Both</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Type</label>
          <select id="typeFilter">
            <option value="">All</option>
            <option>Video</option>
            <option>PDF</option>
          </select>
        </div>

        <button id="newCourseBtn" class="new-course-btn">+ New Course</button>
      </div>
    `;

    qs("#newCourseBtn").onclick = () => Courses.openModal();
    qs("#backDashboardBtn").onclick = () => showPage("dashboard");
  }

  /* =========================
     COURSES MODULE
  ========================= */
  const Courses = (() => {
    const KEY = "instructor_courses";
    let courses = JSON.parse(localStorage.getItem(KEY) || "[]");
    let forceDraft = false;

    const modal = qs("#courseModal");
    const form = qs("#courseForm");

    const saveCourses = () => localStorage.setItem(KEY, JSON.stringify(courses));

    function openModal(course = null) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";

      if (course) {
        qs("#courseTitle").value = course.title;
        qs("#courseDescription").value = course.description;
        qs("#courseCover").value = "";
        qs("#courseDurationValue").value = course.durationValue || "";
        qs("#courseDurationUnit").value = course.durationUnit || "Hours";
        qs("#courseLocation").value = course.location || "";
        qs("#courseType").value = course.type || "";
        qs("#courseChapters").value = JSON.stringify(course.chapters || []);
        qs("#coursePreview").value = course.previewTitle || "";
        qs("#courseStatus").value = course.status || "draft";
      } else form.reset();
    }

    function closeModal() {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      form.reset();
      forceDraft = false;
      document.body.style.overflow = "";
    }

    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
    qs("#closeCourseModal").onclick = closeModal;

    function init() {
      render();
    }

    function render() {
      const container = qs("#my-courses-grid");
      if (!container) return;

      if (!courses.length) {
        container.innerHTML = `
          <div class="glass p-6 rounded-2xl text-center fade-in">
            <p>No courses yet</p>
            <button class="btn-primary mt-4" id="createCourseBtn">Create first course</button>
          </div>
        `;
        qs("#createCourseBtn").onclick = () => openModal();
        return;
      }

      container.innerHTML = courses.map(c => `
        <div class="course-card cursor-pointer relative" data-id="${c.id}">
          <img src="${c.cover || 'https://via.placeholder.com/400x200'}" class="w-full h-32 object-cover rounded-xl mb-3">
          <h3 class="title-strong text-lg">${c.title}</h3>
          <p class="subtitle text-sm mt-1">${c.description}</p>
        </div>
      `).join("");

      container.querySelectorAll(".course-card").forEach(card => {
        card.addEventListener("click", () => openCourseDetail(card.dataset.id));
      });
    }

    function create(data) {
      const newCourse = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
      courses.push(newCourse);
      saveCourses();
      render();
    }

    form.addEventListener("submit", e => {
      e.preventDefault();
      const file = qs("#courseCover").files[0];
      const coverURL = file ? URL.createObjectURL(file) : "";

      const selectedStatus = qs("#courseStatus").value;
      const finalStatus = forceDraft ? "draft" : selectedStatus;

      const data = {
        title: qs("#courseTitle").value,
        description: qs("#courseDescription").value,
        cover: coverURL,
        durationValue: qs("#courseDurationValue").value,
        durationUnit: qs("#courseDurationUnit").value,
        location: qs("#courseLocation").value,
        type: qs("#courseType").value,
        chapters: JSON.parse(qs("#courseChapters").value || "[]"),
        previewTitle: qs("#coursePreview").value,
        status: finalStatus
      };

      create(data);
      closeModal();
    });

    qs("#saveDraftBtn").onclick = () => {
      forceDraft = true;
      form.requestSubmit();
    };

    return { init, openModal };
  })();

  /* =========================
     COURSE DETAIL
  ========================= */
  function openCourseDetail(courseId) {
    const courses = JSON.parse(localStorage.getItem("instructor_courses") || "[]");
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    mainSidebar.classList.add("hidden");
    coursesSidebar.classList.add("hidden");
    mainContent.style.width = "100%";

    const container = qs("#courseDetailContainer");
    container.innerHTML = generateCourseDetailHTML(course);

    qs("#editCourseBtn").onclick = () => Courses.openModal(course);
    qs("#addChapterBtn").onclick = () => openChapterModal(course);

    showPage("course-detail");
  }

  function generateCourseDetailHTML(course) {
    return `
      <div class="course-hero relative rounded-2xl overflow-hidden">
        <img id="courseHeroImg" class="w-full h-60 object-cover" src="${course.cover || 'https://via.placeholder.com/1200x400'}" alt="Course Cover">
        <div class="absolute bottom-4 left-4 text-white">
          <h1 id="courseHeroTitle" class="text-3xl font-bold">${course.title}</h1>
          <p id="courseHeroDesc" class="text-sm mt-1 max-w-xl">${course.description}</p>
        </div>
      </div>
      <div class="flex flex-col md:flex-row gap-6 mt-6">
        <div class="flex-1 space-y-4">
          <div class="flex items-center gap-3">
            <img id="teacherPhoto" class="w-12 h-12 rounded-full" src="${localStorage.getItem("userPhoto") || 'https://via.placeholder.com/60'}" alt="Instructor">
            <span id="teacherName" class="font-semibold">${localStorage.getItem("userName") || "Instructor"}</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 course-info">
            <div class="info-block"><div class="number">${course.durationValue || 0} ${course.durationUnit || ''}</div><div class="label">Duration</div></div>
            <div class="info-block"><div class="number">${course.chapters?.length || 0}</div><div class="label">Chapters</div></div>
            <div class="info-block info-block-location"><span class="tag">${course.location || '-'}</span><div class="label">Location</div></div>
            <div class="info-block"><span>${course.type || '-'}</span><div class="label">Type</div></div>
          </div>
          <h3 class="text-lg font-bold mt-4">Chapters</h3>
          <div id="chaptersGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${(course.chapters || []).map(ch => `
              <div class="chapter-card relative border rounded-xl p-3">
                <img src="${ch.cover || 'https://via.placeholder.com/300x200'}" class="w-full h-32 object-cover rounded-lg mb-2">
                <h4 class="font-semibold">${ch.title}</h4>
                <p class="text-sm text-gray-500">${ch.description || ''}</p>
                ${ch.preview ? `<span class="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">Preview</span>` 
                             : `<span class="absolute top-2 right-2 bg-gray-400 text-white text-xs px-2 py-1 rounded">Locked</span>`}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="flex-1 space-y-4">
          <h3 class="text-lg font-bold">Reviews</h3>
          <div id="reviewsGrid" class="space-y-2">
            ${(course.reviews || []).map(r => `
              <div class="p-3 border rounded-xl">
                <div class="flex items-center gap-2"><strong>${r.user}</strong><span class="text-sm text-gray-500">${r.rating}⭐</span></div>
                <p class="text-sm mt-1">${r.comment}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="mt-6 flex gap-2">
        <button id="editCourseBtn" class="btn-primary">Edit Course</button>
        <button id="addChapterBtn" class="btn-primary">Add Chapter</button>
      </div>
    `;
  }

  function openChapterModal(course, chapter = null) {
    const modal = qs("#chapterModal");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    const form = qs("#chapterForm");

    if (chapter) {
      qs("input[name=title]", form).value = chapter.title;
      qs("input[name=cover]", form).value = chapter.cover;
      qs("input[name=video]", form).value = chapter.video;
      qs("input[name=duration]", form).value = chapter.duration;
      qs("input[name=preview]", form).checked = chapter.preview || false;
      qs("input[name=chapterId]", form).value = chapter.id;
      qs("#chapterModalTitle").textContent = "Edit Chapter";
    } else form.reset();

    form.onsubmit = e => {
      e.preventDefault();
      const id = qs("input[name=chapterId]", form).value || crypto.randomUUID();
      const newChapter = {
        id,
        title: qs("input[name=title]", form).value,
        cover: qs("input[name=cover]", form).value,
        video: qs("input[name=video]", form).value,
        duration: qs("input[name=duration]", form).value,
        preview: qs("input[name=preview]", form).checked
      };

      if (!course.chapters) course.chapters = [];
      const idx = course.chapters.findIndex(c => c.id === id);
      if (idx > -1) course.chapters[idx] = newChapter;
      else course.chapters.push(newChapter);

      const allCourses = JSON.parse(localStorage.getItem("instructor_courses") || "[]")
        .map(c => c.id === course.id ? course : c);
      localStorage.setItem("instructor_courses", JSON.stringify(allCourses));

      modal.classList.remove("active");
      document.body.style.overflow = "";
      openCourseDetail(course.id);
    };

    qs("[data-close-modal]", modal).onclick = () => {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    };
  }

  /* =========================
     INIT
  ========================= */
  buildCoursesSidebar();
  showPage("dashboard");
});
