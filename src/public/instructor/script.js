document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     HELPERS
  ========================= */
  const qs  = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];

  const mainSidebar    = qs("#mainSidebar");
  const coursesSidebar = qs("#coursesSidebar");
  const overlay        = qs("#overlay");
  const menuBtn        = qs("#menuBtn");
  const mainContent    = qs("main.course-page");

  /* =========================
     AUTH
  ========================= */
  const LOGIN_URL = "/homepage/login.html";
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  if (!isLoggedIn || role !== "instructor") {
    window.location.replace(LOGIN_URL);
    return;
  }

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
    if(window.innerWidth < 1024) overlay.classList.remove("hidden");
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

    qsa(".nav-item").forEach(a => {
      a.classList.toggle("active", a.dataset.page === id);
    });

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

        <button id="backDashboardBtn"
          class="nav-item bg-black/90 text-white rounded-xl justify-center mb-2">
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

        <button id="newCourseBtn" class="new-course-btn">
          + New Course
        </button>

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

    const saveCourses = () =>
      localStorage.setItem(KEY, JSON.stringify(courses));

    /* ===== MODAL ===== */
    function openModal(course = null) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";

      if (course) {
        // Prefill modal
        qs("#courseTitle").value = course.title;
        qs("#courseDescription").value = course.description;
        qs("#courseCover").value = "";
        qs("#courseDurationValue").value = course.durationValue || "";
        qs("#courseDurationUnit").value = course.durationUnit || "hours";
        qs("#courseLocation").value = course.location || "";
        qs("#courseType").value = course.type || "";
        qs("#courseChapters").value = JSON.stringify(course.chapters || []);
        qs("#coursePreview").value = course.previewTitle || "";
        qs("#courseStatus").value = course.status || "draft";
      } else {
        form.reset();
      }
    }

    function closeModal() {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      form.reset();
      forceDraft = false;
      document.body.style.overflow = "";
    }

    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeModal();
    });

    qs("#closeCourseModal").onclick = closeModal;

    /* ===== INIT ===== */
    function init() {
      render();
    }

    /* ===== RENDER ===== */
    function render() {
      const container = qs("#my-courses-grid");
      if (!container) return;

      if (!courses.length) {
        container.innerHTML = `
          <div class="glass p-6 rounded-2xl text-center fade-in">
            <p>No courses yet</p>
            <button class="btn-primary mt-4" id="createCourseBtn">
              Create first course
            </button>
          </div>
        `;
        qs("#createCourseBtn").onclick = () => openModal();
        return;
      }

      container.innerHTML = courses.map(c => `
        <div class="course-card cursor-pointer relative" data-id="${c.id}">
          <img src="${c.cover || 'https://via.placeholder.com/400x200'}"
               class="w-full h-32 object-cover rounded-xl mb-3">
          <h3 class="title-strong text-lg">${c.title}</h3>
          <p class="subtitle text-sm mt-1">${c.description}</p>
        </div>
      `).join("");

      container.querySelectorAll(".course-card").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.dataset.id;
          openCourseDetail(id);
        });
      });
    }

    /* ===== CREATE ===== */
    function create(data) {
      const newCourse = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString()
      };

      courses.push(newCourse);
      saveCourses();
      render();
    }

    /* ===== FORM SUBMIT ===== */
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

    /* ===== HELPERS ===== */
    return { init, openModal };
  })();

  /* =========================
     COURSE DETAIL
  ========================= */
  function openCourseDetail(courseId) {
    const courses = JSON.parse(localStorage.getItem("instructor_courses") || "[]");
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // Hide sidebars
    mainSidebar.classList.add("hidden");
    coursesSidebar.classList.add("hidden");
    mainContent.style.width = "100%";

    const hero = qs("#courseCover");
    hero.src = course.cover || 'https://via.placeholder.com/1200x400';

    qs("#courseTitle").textContent = course.title;
    qs("#courseDescription").textContent = course.description;
    qs("#courseTypeBadge").textContent = course.type || "Course";
    qs("#courseTypeBadge").className = "course-badge " + (course.type || "mixed");

    qs("#teacherPhoto").src = localStorage.getItem("userPhoto") || 'https://via.placeholder.com/60';
    qs("#teacherName").textContent = localStorage.getItem("userName") || "Instructor";

    const infoContainer = qs(".course-info");
    infoContainer.innerHTML = `
      <div class="info-block">
        <div class="number">${course.durationValue || 0}</div>
        <div class="label">Duration</div>
      </div>
      <div class="info-block">
        <div class="number">${course.chapters?.length || 0}</div>
        <div class="label">Chapters</div>
      </div>
      <div class="info-block info-block-location">
        <span class="tag">${course.location || "-"}</span>
        <div class="label">Location</div>
      </div>
      <div class="info-block">
        <span>${course.type || "-"}</span>
        <div class="label">Type</div>
      </div>
    `;

    const chaptersGrid = qs("#chaptersGrid");
    chaptersGrid.innerHTML = (course.chapters || []).map(ch => `
      <div class="chapter-card">
        <img src="${ch.cover || 'https://via.placeholder.com/300x200'}">
        <div>
          <h4>${ch.title}</h4>
          <p>${ch.duration}</p>
        </div>
        ${ch.preview
          ? `<span class="badge">Preview</span>`
          : `<span class="lock">Locked</span>`}
      </div>
    `).join("");

    renderReviewsSection(course);

    // Action buttons
    qs("#editCourseBtn").onclick = () => Courses.openModal(course);
    qs("#addChapterBtn").onclick = () => openChapterModal(course);

    showPage("course-detail");
  }

  function renderReviewsSection(course) {
    const reviews = course.reviews || [];
    const total = reviews.length;
    const avg = total === 0 ? 0 : (reviews.reduce((sum, r) => sum + r.rating, 0)/total).toFixed(1);

    qs("#averageRating").textContent = avg;
    qs("#ratingStars").textContent = "★".repeat(Math.round(avg)) + "☆".repeat(5-Math.round(avg));
    qs("#totalReviews").textContent = `(${total} reviews)`;

    const list = qs("#reviewsList");
    list.innerHTML = (reviews.map(r => `
      <div class="review-card">
        <strong>${r.name}</strong>
        <div>${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div>
        <p>${r.comment}</p>
        ${r.reply ? `<div class="reply-box"><strong>Reply:</strong><p>${r.reply}</p></div>` : `
        <div class="review-actions">
          <button class="replyBtn">Reply</button>
        </div>`}
      </div>
    `) || []).join("");
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
    } else {
      form.reset();
      qs("#chapterModalTitle").textContent = "Add Chapter";
    }

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
      const existingIndex = course.chapters.findIndex(c => c.id === id);
      if (existingIndex > -1) course.chapters[existingIndex] = newChapter;
      else course.chapters.push(newChapter);

      localStorage.setItem("instructor_courses", JSON.stringify(JSON.parse(localStorage.getItem("instructor_courses") || "[]").map(c => c.id===course.id?course:c)));
      modal.classList.remove("active");
      document.body.style.overflow = "";
      openCourseDetail(course.id);
    };

    modal.querySelector("[data-close-modal]").onclick = () => {
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
