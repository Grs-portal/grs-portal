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

    // hide all page sections
    qsa(".page-section").forEach(p => p.classList.add("hidden"));

    const page = qs("#" + id);
    if (page) page.classList.remove("hidden");

    qsa(".nav-item").forEach(a => {
      a.classList.toggle("active", a.dataset.page === id);
    });

    // Courses page
    if (id === "my-courses") {
      openCoursesSidebar();
      Courses.init();
      return;
    }

    // Course detail page
    if (id === "course-detail") {
      closeAllSidebars();
      // hide courses grid to prevent it showing under detail
      qs("#my-courses-grid")?.classList.add("hidden");
      return;
    }

    // dashboard or other pages
    openMainSidebar();

    // ensure courses grid is visible when not in detail
    qs("#my-courses-grid")?.classList.remove("hidden");
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
          <label>Program Type</label>
          <select id="typeFilter">
            <option value="">All</option>
            <option value="course">Courses</option>
            <option value="workshops">Workshops</option>
            <option value="activities">Activities</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Theme</label>
          <select id="themeFilter">
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
    const typeFilter = qs("#typeFilter");

    const applyFilters = () => {
      Courses.render({
        search: searchInput?.value || "",
        status: statusFilter?.value || "",
        type: typeFilter?.value || ""
      });
    };

    typeFilter?.addEventListener("change", applyFilters);
    searchInput?.addEventListener("input", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
  };

  /* =====================================================
  COURSES MODULE
  ====================================================== */
  const Courses = (() => {
    // ... same as your original code
  })();

  /* =====================================================
  COURSE DETAIL
  ====================================================== */
  const openCourseDetail = async (id) => {
    closeAllSidebars();
    showPage("course-detail");
    // ... same as your original code
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
