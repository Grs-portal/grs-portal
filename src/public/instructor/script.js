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
  function closeAllSidebars() {
  mainSidebar.classList.remove("active");
  coursesSidebar.classList.remove("active");
  overlay.classList.add("hidden");
}

function openMainSidebar() {
  coursesSidebar.classList.remove("active");
  mainSidebar.classList.add("active");
  overlay.classList.add("hidden");
}

function openCoursesSidebar() {
  mainSidebar.classList.remove("active");
  coursesSidebar.classList.add("active");
  overlay.classList.remove("hidden");
}

  // mobile menu toggle
  menuBtn.addEventListener("click", () => {
    if (mainSidebar.classList.contains("active")) closeAllSidebars();
    else openMainSidebar();
  });

  overlay.addEventListener("click", closeAllSidebars);

  /* =========================
     ROUTER
  ========================= */
  function showPage(id) {

    // hide all pages
    qsa(".page-section").forEach(p => p.classList.add("hidden"));

    // show selected page
    const page = qs("#" + id);
    if (page) page.classList.remove("hidden");

    // nav highlight
    qsa(".nav-item").forEach(a => {
      a.classList.toggle("active", a.dataset.page === id);
    });

    // sidebar logic
    if (id === "my-courses") openCoursesSidebar();
    else openMainSidebar();

    // init courses if page
    if (id === "my-courses") Courses.init();
  }

  // nav clicks
  qsa(".nav-item").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  /* =========================
     BUILD COURSES SIDEBAR
  ========================= */
function buildCoursesSidebar() {
  coursesSidebar.innerHTML = `
    <aside class="courses-sidebar-content h-full overflow-y-auto">

      <!-- NEW: top back button -->
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
            <span >12</span>
            <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span>
            <span>18</span><span>19</span><span>20</span><span>21</span><span>22</span>
            <span>23</span><span class="event-day">24</span><span>25</span><span>26</span><span>27</span>
            <span>28</span><span>29</span><span>30</span><span>31</span>
          </div>
          <p class="calendar-hint">Click to view full calendar</p>
        </div>
      </div>

    </div>
    </aside>
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

  const save = () =>
    localStorage.setItem(KEY, JSON.stringify(courses));

  const modal = qs("#courseModal");
  const form = qs("#courseForm");

  function openModal() {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    form.reset();
  }

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
          <button class="btn-primary mt-4" id="createCourseBtn">
            Create first course
          </button>
        </div>
      `;
      qs("#createCourseBtn").onclick = openModal;
      return;
    }

    container.innerHTML = courses.map(c => `
      <div class="course-card fade-in" data-id="${c.id}">
        <img src="${c.cover || 'https://via.placeholder.com/400x200'}"
          class="w-full h-32 object-cover rounded-xl mb-3">

        <h3 class="title-strong text-lg">${c.title}</h3>

        <p class="subtitle text-sm mt-1 line-clamp-2">
          ${c.description}
        </p>

        <div class="flex justify-between text-xs mt-3 opacity-80">
          <span>${c.location}</span>
          <span>${c.durationValue} ${c.durationUnit}</span>
        </div>

        <div class="mt-2 text-xs font-semibold">
          Status: ${c.status}
        </div>
      </div>
    `).join("");
  }

  function create(data) {
    const newCourse = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };

    courses.push(newCourse);
    save();
    render();
  }

  /* ===== FORM SUBMIT ===== */

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = qs("#courseCover").files[0];
    let coverURL = "";

    if (file) {
      coverURL = URL.createObjectURL(file);
    }

    const location = qs("#courseLocation").value;

    const data = {
      title: qs("#courseTitle").value,
      description: qs("#courseDescription").value,
      cover: coverURL,
      durationValue: qs("#courseDurationValue").value,
      durationUnit: qs("#courseDurationUnit").value,
      location,
      type: (location === "in-person") ? null : qs("#courseType").value,
      chapters: qs("#courseChapters").value,
      previewTitle: qs("#coursePreview").value,
      status: qs("#courseStatus").value
    };

    create(data);
    closeModal();
  });

  qs("#closeCourseModal").onclick = closeModal;

  /* ===== Location conditional logic ===== */

  qs("#courseLocation").addEventListener("change", (e) => {
    const typeWrapper = qs("#typeWrapper");
    if (e.target.value === "in-person") {
      typeWrapper.style.display = "none";
    } else {
      typeWrapper.style.display = "block";
    }
  });

  return { init, openModal };

})();

  /* =========================
     INIT
  ========================= */
  buildCoursesSidebar();
  showPage("dashboard");

});













