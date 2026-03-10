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
      if (mainSidebar?.classList.contains("active")) closeAllSidebars();
      else openMainSidebar();
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
          <label>Theme</label>
          <select>
            <option value="">All</option>
            <option value="rest">Rest & Relaxation</option>
            <option value="recovery">Recovery & Balance</option>
            <option value="insight">Self-insight</option>
            <option value="connection">Connection</option>
          </select>
        </div>

        <div class="filter-group mt-4">
          <label>Calendar</label>
          <input type="date" id="calendarFilter"/>
        </div>

      </div>
    `;

    qs("#newCourseBtn")?.addEventListener("click", () => Courses.openModal());
    qs("#backDashboardBtn")?.addEventListener("click", () => showPage("dashboard"));

    const searchInput = qs("#searchCourse");
    const statusFilter = qs("#statusFilter");

    const applyFilters = () => {
      Courses.render({
        search: searchInput?.value || "",
        status: statusFilter?.value || ""
      });
    };

    searchInput?.addEventListener("input", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
  };

  /* =====================================================
  COURSES MODULE
  ====================================================== */
  const Courses = (() => {

    const API = "/api/courses";

    const modal = qs("#courseModal");
    const form = qs("#courseForm");

    let courses = [];
    let forceDraft = false;
    let initialized = false;

    const formatStatus = s =>
      (s || "").replace("-", " ").toUpperCase();

    const getStatusClass = status => {
      switch (status) {
        case "draft": return "bg-gray-200 text-gray-800";
        case "not-started": return "bg-yellow-100 text-yellow-800";
        case "ongoing": return "bg-blue-100 text-blue-800";
        case "finished": return "bg-green-100 text-green-800";
        default: return "bg-gray-200 text-gray-800";
      }
    };

    const toBase64 = file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const init = async () => {
      if (initialized) return;
      initialized = true;
      await loadCourses();
    };

    const loadCourses = async () => {

      try {

        const res = await fetch(API);
        courses = await res.json();

        render();

      } catch (err) {
        console.error("Failed to load courses", err);
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

          <div class="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${getStatusClass(c.status)}">
            ${formatStatus(c.status)}
          </div>

          <img
            src="${c.cover || "https://via.placeholder.com/400x200"}"
            class="w-full h-32 object-cover rounded-xl mb-3"
          >

          <div class="flex justify-between items-center mb-1">
            <h3 class="title-strong text-lg">${c.title}</h3>
            ${c.startDate ? `<span class="text-xs text-gray-500">${new Date(c.startDate).toLocaleDateString()}</span>` : ""}
          </div>

          <div class="text-sm">
            <span class="font-semibold">Type:</span> ${c.programType || "-"}
          </div>

          <div class="text-sm">
            <span class="font-semibold">Sessions:</span> ${c.sessionsValue || "-"} ${c.sessionsUnit || ""}
          </div>

        </div>
      `).join("");

      container.querySelectorAll(".course-card").forEach(card => {
        card.addEventListener("click", () => {
          openCourseDetail(card.dataset.id);
        });
      });

    };

    /* ================= CREATE COURSE ================= */

    const createCourse = async (data, openDetail = true) => {

      try {

        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        const newCourse = await res.json();

        courses.push(newCourse);

        render();

        if (openDetail) openCourseDetail(newCourse.id);

      } catch (err) {
        console.error("Failed to create course", err);
      }
    };

    /* ================= FORM SUBMIT ================= */

    form?.addEventListener("submit", async e => {

      e.preventDefault();

      const file = qs("#courseCover")?.files?.[0];
      const cover = file ? await toBase64(file) : "";

      const selectedStatus = qs("#courseStatus")?.value;

      let finalStatus = forceDraft ? "draft" : selectedStatus;

      const newCourse = {

        title: qs("#courseTitle")?.value.trim(),
        description: qs("#courseDescription")?.value.trim(),
        cover,

        durationValue: qs("#courseDurationValue")?.value,
        durationUnit: qs("#courseDurationUnit")?.value,

        sessionsValue: qs("#courseSessionsValue")?.value,
        sessionsUnit: qs("#courseSessionsUnit")?.value,

        programType: qs("#courseProgramType")?.value,
        theme: qs("#courseTheme")?.value,
        offer: qs("#courseOffer")?.value,

        startDate: qs("#courseStartDate")?.value || null,

        status: finalStatus,

        createdByUsername: username,
        createdByAvatar: profilePic
      };

      closeModal();

      const openDetail = !forceDraft;
      forceDraft = false;

      await createCourse(newCourse, openDetail);

    });

    /* ================= MODAL ================= */

    const openModal = () => {

      modal?.classList.remove("hidden");
      modal?.classList.add("flex");

      document.body.style.overflow = "hidden";

    };

    const closeModal = () => {

      modal?.classList.add("hidden");
      modal?.classList.remove("flex");

      form?.reset();

      forceDraft = false;

      document.body.style.overflow = "";

    };

    qs("#closeCourseModal")?.addEventListener("click", closeModal);

    qs("#saveDraftBtn")?.addEventListener("click", () => {
      forceDraft = true;
      form?.requestSubmit();
    });

    return {
      init,
      openModal,
      render,
      loadCourses
    };

  })();

  /* =====================================================
  COURSE DETAIL
  ====================================================== */

  const openCourseDetail = async (id) => {

    closeAllSidebars();
    showPage("course-detail");

    const res = await fetch("/api/courses");
    const allCourses = await res.json();

    const course = allCourses.find(c => c.id == id);
    if (!course) return;

    const container = qs("#courseDetailContainer");

    container.innerHTML = `
      <div class="glass rounded-2xl overflow-hidden">

        <img
          src="${course.cover || "https://via.placeholder.com/1200x400"}"
          class="w-full h-72 object-cover"
        >

        <div class="p-8">

          <div class="flex justify-between items-center mb-2">
            <h1 class="text-3xl font-bold">${course.title}</h1>
            ${course.startDate ? `<span class="text-sm text-gray-500">${new Date(course.startDate).toLocaleDateString()}</span>` : ""}
          </div>

          <div class="flex items-center gap-3 mb-6">

            <img
              src="${course.createdByAvatar || "https://png.pngtree.com/png-clipart/20210915/ourmid/pngtree-avatar-placeholder-abstract-white-blue-green-png-image_3918476.jpg/40"}"
              class="w-8 h-8 rounded-full object-cover"
            >

            <span class="text-sm text-gray-600">
              ${course.createdByUsername || "Unknown"}
            </span>

          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            <div class="glass p-4 rounded-xl text-center">
              <div class="text-lg font-semibold">
                ${course.sessionsValue} ${course.sessionsUnit}
              </div>
              <div class="text-xs uppercase opacity-60">
                Sessions
              </div>
            </div>

            <div class="glass p-4 rounded-xl text-center">
              <div class="text-lg font-semibold">
                ${course.durationValue} ${course.durationUnit}
              </div>
              <div class="text-xs uppercase opacity-60">
                Duration
              </div>
            </div>

            <div class="glass p-4 rounded-xl text-center">
              <div class="text-sm font-semibold">
                ${course.theme}
              </div>
              <div class="text-xs uppercase opacity-60">
                Theme
              </div>
            </div>

            <div class="glass p-4 rounded-xl text-center">
              <div class="text-sm font-semibold">
                ${course.offer}
              </div>
              <div class="text-xs uppercase opacity-60">
                Offering
              </div>
            </div>

          </div>

          <div class="text-gray-700 whitespace-pre-wrap leading-relaxed">
            ${course.description}
          </div>

        </div>
      </div>

      <button id="backToCourses" class="mt-6 btn-primary">
        Back
      </button>
    `;

    qs("#backToCourses")?.addEventListener("click", () => {
      showPage("my-courses");
    });

  };

  qsa(".nav-item").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  buildCoursesSidebar();
  showPage("dashboard");

});
