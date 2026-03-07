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

  if (!isLoggedIn || role !== "instructor") {
    window.location.replace(LOGIN_URL);
    return;
  }

  /* =====================================================
  SIDEBAR CONTROL
  ====================================================== */
  const closeAllSidebars = () => {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.remove("active");
    overlay.classList.remove("active");
  };

  const openMainSidebar = () => {
    coursesSidebar.classList.remove("active");
    mainSidebar.classList.add("active");
    if (window.innerWidth < 1024) overlay.classList.add("active");
  };

  const openCoursesSidebar = () => {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.add("active");
    if (window.innerWidth < 1024) overlay.classList.add("active");
  };

  menuBtn.addEventListener("click", () => {
    if (mainSidebar.classList.contains("active")) closeAllSidebars();
    else openMainSidebar();
  });

  overlay.addEventListener("click", closeAllSidebars);

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
            <option value="draft">Draft</option>
            <option value="not-started">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="finished">Completed</option>
          </select>
        </div>

        <button id="newCourseBtn" class="new-course-btn">
          + New Course
        </button>

      </div>
    `;

    qs("#newCourseBtn").onclick = () => Courses.openModal();
    qs("#backDashboardBtn").onclick = () => showPage("dashboard");

    const searchInput = qs("#searchCourse");
    const statusFilter = qs("#statusFilter");

    const applyFilters = () => Courses.render({
      search: searchInput.value,
      status: statusFilter.value
    });

    searchInput.addEventListener("input", applyFilters);
    statusFilter.addEventListener("change", applyFilters);

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

    /* ================= HELPERS ================= */
    const formatStatus = s => (s || "").replace("-", " ").toUpperCase();
    const getStatusClass = status => {
      switch (status) {
        case "draft": return "bg-gray-200 text-gray-800";
        case "not-started": return "bg-yellow-100 text-yellow-800";
        case "ongoing": return "bg-blue-100 text-blue-800";
        case "finished": return "bg-green-100 text-green-800";
        default: return "bg-gray-200 text-gray-800";
      }
    };

    const toBase64 = file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    /* ================= LOAD COURSES ================= */
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
        filtered = filtered.filter(c => c.title.toLowerCase().includes(filters.search.toLowerCase()));
      }
      if (filters.status) {
        filtered = filtered.filter(c => c.status === filters.status);
      }

      if (!filtered.length) {
        container.innerHTML = `
          <div class="glass p-6 rounded-2xl text-center">
            <p>No programs yet</p>
            <button id="createCourseBtn" class="btn-primary mt-4">Create Program</button>
          </div>
        `;
        qs("#createCourseBtn").onclick = openModal;
        return;
      }

      container.innerHTML = filtered.map(c => `
        <div class="course-card cursor-pointer relative" data-id="${c.id}">
          <div class="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${getStatusClass(c.status)}">
            ${formatStatus(c.status)}
          </div>
          <img src="${c.cover || "https://via.placeholder.com/400x200"}" class="w-full h-32 object-cover rounded-xl mb-3">
          <h3 class="title-strong text-lg">${c.title}</h3>
          <p class="subtitle text-sm mt-1 line-clamp-2">${c.description || ""}</p>
        </div>
      `).join("");

      container.querySelectorAll(".course-card").forEach(card => {
        card.onclick = () => openCourseDetail(card.dataset.id);
      });
    };

    /* ================= CREATE COURSE ================= */
    const createCourse = async (data) => {
      try {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const newCourse = await res.json();
        courses.push(newCourse);
        render();
        openCourseDetail(newCourse.id);
      } catch (err) {
        console.error("Failed to create course", err);
      }
    };

    form.addEventListener("submit", async e => {
      e.preventDefault();

      const file = qs("#courseCover").files[0];
      const cover = file ? await toBase64(file) : "";

      const selectedStatus = qs("#courseStatus").value;
      let finalStatus = forceDraft ? "draft" : selectedStatus;

      if (!forceDraft && selectedStatus === "draft") {
        alert("Cannot publish a course while status is Draft. Choose another status or Save Draft.");
        return;
      }

      const newCourse = {
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
        status: finalStatus
      };

      closeModal();
      forceDraft = false;
      await createCourse(newCourse);
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
      forceDraft = false;
      document.body.style.overflow = "";
    };

    qs("#closeCourseModal").onclick = closeModal;
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

    qs("#saveDraftBtn").onclick = () => {
      forceDraft = true;
      form.requestSubmit();
    };

    return { init, openModal, render, loadCourses };
  })();

  /* =====================================================
  COURSE DETAIL
  ====================================================== */
  const openCourseDetail = async (id) => {
    closeAllSidebars();
    showPage("course-detail");

    try {
      const res = await fetch("/api/courses");
      const courses = await res.json();
      const course = courses.find(c => c.id == id);
      if (!course) return;

      const container = qs("#courseDetailContainer");
      container.innerHTML = `
        <div class="glass rounded-2xl overflow-hidden">
          <img src="${course.cover || "https://via.placeholder.com/1200x400"}" class="w-full h-72 object-cover">
          <div class="p-8">
            <h1 class="text-3xl font-bold mb-6">${course.title}</h1>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div class="glass p-4 rounded-xl text-center">
                <div class="text-lg font-semibold">${course.sessionsValue} ${course.sessionsUnit}</div>
                <div class="text-xs uppercase opacity-60">Sessions</div>
              </div>
              <div class="glass p-4 rounded-xl text-center">
                <div class="text-lg font-semibold">${course.durationValue} ${course.durationUnit}</div>
                <div class="text-xs uppercase opacity-60">Duration</div>
              </div>
              <div class="glass p-4 rounded-xl text-center">
                <div class="text-sm font-semibold">${course.theme}</div>
                <div class="text-xs uppercase opacity-60">Theme</div>
              </div>
              <div class="glass p-4 rounded-xl text-center">
                <div class="text-sm font-semibold">${course.offer}</div>
                <div class="text-xs uppercase opacity-60">Offering</div>
              </div>
            </div>
            <div class="text-gray-700 whitespace-pre-wrap leading-relaxed">${course.description}</div>
          </div>
        </div>
        <button id="backToCourses" class="mt-6 btn-primary">Back</button>
      `;

      qs("#backToCourses").onclick = () => showPage("my-courses");
    } catch (err) {
      console.error("Failed to load course detail", err);
    }
  };

  /* =====================================================
  NAV
  ====================================================== */
  qsa(".nav-item").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  /* =====================================================
  INIT
  ====================================================== */
  buildCoursesSidebar();
  showPage("dashboard");

});
