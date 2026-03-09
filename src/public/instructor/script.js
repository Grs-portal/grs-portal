document.addEventListener("DOMContentLoaded", () => {

  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];

  const mainSidebar = qs("#mainSidebar");
  const coursesSidebar = qs("#coursesSidebar");
  const overlay = qs("#overlay");
  const menuBtn = qs("#menuBtn");

  /* =====================================================
  AUTH
  ====================================================== */

  const LOGIN_URL = "/homepage/login.html";

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  const username = localStorage.getItem("username");
  const profilePic = localStorage.getItem("profilePic");

  if (!isLoggedIn || role !== "instructor") {
    window.location.replace(LOGIN_URL);
    return;
  }

  /* =====================================================
  SIDEBAR CONTROL
  ====================================================== */

  const closeAllSidebars = () => {
    mainSidebar?.classList.remove("active");
    coursesSidebar?.classList.remove("active");
    overlay?.classList.remove("active");
  };

  const openMainSidebar = () => {
    coursesSidebar?.classList.remove("active");
    mainSidebar?.classList.add("active");
    if (window.innerWidth < 1024) overlay?.classList.add("active");
  };

  const openCoursesSidebar = () => {
    mainSidebar?.classList.remove("active");
    coursesSidebar?.classList.add("active");
    if (window.innerWidth < 1024) overlay?.classList.add("active");
  };

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {

      if (mainSidebar?.classList.contains("active")) {
        closeAllSidebars();
      } else {
        openMainSidebar();
      }

    });
  }

  overlay?.addEventListener("click", closeAllSidebars);

  /* =====================================================
  ROUTER
  ====================================================== */

  const showPage = (id) => {

    qsa(".page-section").forEach(p => p.classList.add("hidden"));

    const page = qs("#" + id);
    if (page) page.classList.remove("hidden");

    qsa(".nav-item").forEach(a => {
      a.classList.toggle("active", a.dataset.page === id);
    });

    if (id === "my-courses") {
      openCoursesSidebar();
      Courses.init();
      return;
    }

    if (id === "course-detail") {
      closeAllSidebars();
      return;
    }

    openMainSidebar();
  };

  /* =====================================================
  COURSES SIDEBAR
  ====================================================== */

  const buildCoursesSidebar = () => {

    if (!coursesSidebar) return;

    coursesSidebar.innerHTML = `

      <div class="courses-sidebar-content">

        <button id="backDashboardBtn"
        class="nav-item bg-black/90 text-white rounded-xl justify-center mb-2">
        ☰ Dashboard
        </button>

        <h3 class="sidebar-title">Filter Programs</h3>

        <div class="filter-group">
          <label>Search</label>
          <input id="searchCourse" type="text" placeholder="Search programs..." />
        </div>

        <button id="newCourseBtn" class="new-course-btn">
          + New Course
        </button>

        <div class="filter-group">
          <label>Status</label>
          <select id="statusFilter">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="not-started">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="finished">Completed</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Program Type</label>
          <select id="typeFilter">
            <option value="">All</option>
            <option value="course">Courses</option>
            <option value="workshop">Workshops</option>
            <option value="activity">Activities</option>
          </select>
        </div>

      </div>
    `;

    qs("#newCourseBtn")?.addEventListener("click", () => Courses.openModal());
    qs("#backDashboardBtn")?.addEventListener("click", () => showPage("dashboard"));

    const searchInput = qs("#searchCourse");
    const statusFilter = qs("#statusFilter");
    const typeFilter = qs("#typeFilter");

    const applyFilters = () => {

      Courses.render({
        search: searchInput?.value || "",
        status: statusFilter?.value || "",
        type: typeFilter?.value || ""
      });

    };

    searchInput?.addEventListener("input", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
    typeFilter?.addEventListener("change", applyFilters);

  };

  /* =====================================================
  COURSES MODULE
  ====================================================== */

  const Courses = (() => {

    const API = "/api/courses";

    const modal = qs("#courseModal");
    const form = qs("#courseForm");

    let courses = [];
    let editingId = null;
    let forceDraft = false;

    const toBase64 = file =>
      new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(file);

      });

    /* ================= INIT ================= */

    const init = async () => {
      await loadCourses();
    };

    /* ================= LOAD ================= */

    const loadCourses = async () => {

      try {

        const res = await fetch(API);
        courses = await res.json();

        render();

      } catch (err) {

        console.error("Course load failed", err);

      }

    };

    /* ================= RENDER ================= */

    const render = (filters = {}) => {

      const container = qs("#my-courses-grid");
      if (!container) return;

      let filtered = [...courses];

      if (filters.search) {
        filtered = filtered.filter(c =>
          c.title.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.status) {
        filtered = filtered.filter(c =>
          c.status === filters.status
        );
      }

      if (filters.type) {
        filtered = filtered.filter(c =>
          c.programType === filters.type
        );
      }

      if (!filtered.length) {

        container.innerHTML = `
          <div class="glass p-6 rounded-2xl text-center">
            <p>No programs yet</p>
            <button id="createCourseBtn" class="btn-primary mt-4">
              Create Program
            </button>
          </div>
        `;

        qs("#createCourseBtn")?.addEventListener("click", openModal);

        return;
      }

      container.innerHTML = filtered.map(c => `

        <div class="course-card cursor-pointer relative" data-id="${c.id}">

          <div class="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full bg-gray-200">
            ${c.status}
          </div>

          <img src="${c.cover || "https://via.placeholder.com/400x200"}"
          class="w-full h-32 object-cover rounded-xl mb-3">

          <h3 class="font-bold">${c.title}</h3>

        </div>

      `).join("");

      container.querySelectorAll(".course-card").forEach(card => {

        card.addEventListener("click", () => {

          openCourseDetail(card.dataset.id);

        });

      });

    };

    /* ================= SAVE ================= */

    const saveCourse = async (data) => {

      try {

        let res;

        if (editingId) {

          res = await fetch(`${API}/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });

        } else {

          res = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });

        }

        await res.json();

        await loadCourses();

      } catch (err) {

        console.error("Save failed", err);

      }

    };

    /* ================= FORM ================= */

    form?.addEventListener("submit", async e => {

      e.preventDefault();

      const file = qs("#courseCover")?.files?.[0];
      const cover = file ? await toBase64(file) : "";

      const selectedStatus = qs("#courseStatus").value;

      const finalStatus = forceDraft ? "draft" : selectedStatus;

      const data = {

        title: qs("#courseTitle").value.trim(),
        description: qs("#courseDescription").value.trim(),
        cover,

        durationValue: qs("#courseDurationValue").value,
        durationUnit: qs("#courseDurationUnit").value,

        sessionsValue: qs("#courseSessionsValue").value,
        sessionsUnit: qs("#courseSessionsUnit").value,

        programType: qs("#courseProgramType").value,
        theme: qs("#courseTheme").value,
        offer: qs("#courseOffer").value,

        startDate: qs("#courseStartDate").value,

        status: finalStatus,

        createdByUsername: username,
        createdByAvatar: profilePic

      };

      closeModal();

      await saveCourse(data);

      editingId = null;
      forceDraft = false;

    });

    /* ================= MODAL ================= */

    const openModal = () => {

      modal.classList.remove("hidden");
      modal.classList.add("flex");

      document.body.style.overflow = "hidden";

    };

    const closeModal = () => {

      modal.classList.add("hidden");
      modal.classList.remove("flex");

      form.reset();

      editingId = null;
      forceDraft = false;

      document.body.style.overflow = "";

    };

    qs("#closeCourseModal")?.addEventListener("click", closeModal);

    qs("#saveDraftBtn")?.addEventListener("click", () => {

      forceDraft = true;
      form.requestSubmit();

    });

    return {
      init,
      render,
      openModal,
      loadCourses
    };

  })();

  /* =====================================================
  COURSE DETAIL
  ====================================================== */

  const openCourseDetail = async (id) => {

    showPage("course-detail");

    const res = await fetch("/api/courses");
    const courses = await res.json();

    const course = courses.find(c => c.id == id);
    if (!course) return;

    const container = qs("#courseDetailContainer");

    container.innerHTML = `

      <div class="glass p-8 rounded-2xl">

        <button id="backToCourses" class="btn-primary mb-4">Back</button>

        <img src="${course.cover}" class="w-full h-64 object-cover rounded-xl mb-6">

        <h1 class="text-3xl font-bold mb-2">${course.title}</h1>

        <p class="opacity-70 mb-6">${course.description}</p>

      </div>

    `;

    qs("#backToCourses").addEventListener("click", () => {
      showPage("my-courses");
    });

  };

  /* =====================================================
  NAVIGATION
  ====================================================== */

  qsa(".nav-item").forEach(link => {

    link.addEventListener("click", e => {

      e.preventDefault();

      showPage(link.dataset.page);

    });

  });

  buildCoursesSidebar();

  showPage("dashboard");

});
