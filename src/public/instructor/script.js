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
  const closeAllSidebars = () => {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.remove("active");
    overlay.classList.add("hidden");
  };

  const openMainSidebar = () => {
    coursesSidebar.classList.remove("active");
    mainSidebar.classList.add("active");
    if(window.innerWidth < 1024) overlay.classList.remove("hidden");
  };

  const openCoursesSidebar = () => {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.add("active");
    overlay.classList.remove("hidden");
  };

  menuBtn.addEventListener("click", () => {
    mainSidebar.classList.contains("active") ? closeAllSidebars() : openMainSidebar();
  });

  overlay.addEventListener("click", closeAllSidebars);

  /* =========================
     ROUTER
  ========================= */
  function showPage(id) {
    qsa(".page-section").forEach(p => p.classList.add("hidden"));
    const page = qs("#" + id);
    if (page) page.classList.remove("hidden");

    qsa(".nav-item").forEach(a => {
      a.classList.toggle("active", a.dataset.page === id);
    });

    if (id === "my-courses") openCoursesSidebar();
    else openMainSidebar();

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

        <div class="sidebar-calendar mt-6">
          <p class="calendar-hint">Preview only</p>
          <div class="calendar-preview">
            <div class="calendar-header">February 2026</div>
            <div class="calendar-grid">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              <span></span><span></span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
              <span>12</span>
              <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span>
              <span>18</span><span>19</span><span>20</span><span>21</span><span>22</span>
              <span>23</span><span class="event-day">24</span><span>25</span><span>26</span><span>27</span>
              <span>28</span><span>29</span><span>30</span><span>31</span>
            </div>
            <p class="calendar-hint">Click to view full calendar</p>
          </div>
        </div>
        
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

    /* ===== MODAL ===== */
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

    modal.addEventListener("click", e => { if(e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => { if(e.key === "Escape") closeModal(); });
    qs("#closeCourseModal").onclick = closeModal;

    /* ===== INIT ===== */
    const init = () => render();

    /* ===== RENDER ===== */
    const render = () => {
      const container = qs("#my-courses-grid");
      if (!container) return;

      if (!courses.length) {
        container.innerHTML = `
          <div class="glass p-6 rounded-2xl text-center fade-in">
            <p>No courses yet</p>
            <button class="btn-primary mt-4" id="createCourseBtn">Create first course</button>
          </div>
        `;
        qs("#createCourseBtn").onclick = openModal;
        return;
      }

      container.innerHTML = courses.map(c => `
        <div class="course-card cursor-pointer relative" data-id="${c.id}">
          <div class="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${getStatusClass(c.status)}">
            ${formatStatus(c.status)}
          </div>
          <img src="${c.cover || 'https://via.placeholder.com/400x200'}"
               class="w-full h-32 object-cover rounded-xl mb-3">
          <h3 class="title-strong text-lg">${c.title}</h3>
          <p class="subtitle text-sm mt-1">${c.description}</p>
        </div>
      `).join("");

      // Event delegation instead of per-card listeners
      container.onclick = (e) => {
        const card = e.target.closest(".course-card");
        if (!card) return;
        openCourseDetail(card.dataset.id);
      };
    };

    /* ===== CREATE ===== */
    const create = (data) => {
      const newCourse = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
      courses.push(newCourse);
      saveCourses();
      render();
    };

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
        type: qs("#courseLocation").value === "in-person" ? null : qs("#courseType").value,
        chapters: qs("#courseChapters").value,
        previewTitle: qs("#coursePreview").value,
        status: finalStatus
      };

      create(data);
      closeModal();
    });

    qs("#saveDraftBtn").onclick = () => { forceDraft = true; form.requestSubmit(); };

    qs("#courseLocation").addEventListener("change", e => {
      const typeWrapper = qs("#typeWrapper");
      typeWrapper.style.display = e.target.value === "in-person" ? "none" : "block";
    });

    /* ===== HELPERS ===== */
    function formatStatus(status) { return status.replace("-", " ").toUpperCase(); }

    function getStatusClass(status) {
      switch (status) {
        case "draft": return "bg-gray-200 text-gray-800";
        case "not-started": return "bg-yellow-100 text-yellow-800";
        case "ongoing": return "bg-blue-100 text-blue-800";
        case "finished": return "bg-green-100 text-green-800";
        default: return "bg-gray-200 text-gray-800";
      }
    }

    return { init, openModal };
  })();

  //======Course details page======
  function openCourseDetail(courseId) {
    const courses = JSON.parse(localStorage.getItem("instructor_courses") || "[]");
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const container = qs("#courseDetailContainer");
    container.innerHTML = `<div>... course detail content ...</div>`; // leave as-is or copy your current template
    showPage("course-detail");
  }

  buildCoursesSidebar();
  showPage("dashboard");

});
