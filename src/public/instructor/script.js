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
    closeAllSidebars();
    mainSidebar.classList.add("active");
  }

  function openCoursesSidebar() {
    closeAllSidebars();
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
        </select>
      </div>

      <div class="filter-group">
        <label>Duration</label>
        <select id="durationFilter">
          <option value="">Any</option>
          <option>4 weeks</option>
          <option>8 weeks</option>
          <option>12 weeks</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Type</label>
        <select id="typeFilter">
          <option value="">All</option>
          <option>Course</option>
          <option>Workshop</option>
          <option>Program</option>
        </select>
      </div>

      <button id="newCourseBtn" class="new-course-btn">
        + New Course
      </button>

      <div class="sidebar-calendar mt-6">
        <h4>Program Calendar</h4>

        <div class="calendar-preview">
          <div class="calendar-header">March 2026</div>

          <div class="calendar-grid">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            <span></span><span></span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
            <span class="event-day">12</span>
            <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span>
            <span>18</span><span>19</span><span>20</span><span>21</span><span>22</span>
            <span>23</span><span>24</span><span>25</span><span>26</span><span>27</span>
            <span>28</span><span>29</span><span>30</span><span>31</span>
          </div>

          <p class="calendar-hint">Click to view full calendar</p>
        </div>
      </div>

    </aside>
  `;

  qs("#newCourseBtn").addEventListener("click", () => Courses.create());
}

  /* =========================
     COURSES MODULE
  ========================= */
  const Courses = (() => {
    const KEY = "instructor_courses";
    let courses = JSON.parse(localStorage.getItem(KEY) || "[]");

    const save = () => localStorage.setItem(KEY, JSON.stringify(courses));

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
        qs("#createCourseBtn").onclick = create;
        return;
      }

      container.innerHTML = courses.map(c => `
        <div class="course-card glass p-4 rounded-2xl cursor-pointer hover:scale-[1.02] transition" data-id="${c.id}">
          <h3 class="title-strong text-lg">${c.title}</h3>
          <p class="subtitle mt-1">${c.description || "No description"}</p>
          <button class="btn-primary mt-2" data-edit-id="${c.id}">Edit</button>
        </div>
      `).join("");

      // add card click for details
      qsa(".course-card").forEach(card => {
        card.addEventListener("click", () => alert("Course details coming soon!"));
      });

      // edit buttons
      qsa("[data-edit-id]").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation(); // prevent card click
          const id = btn.dataset.editId;
          const course = courses.find(c => c.id === id);
          const newTitle = prompt("Edit course title:", course.title);
          if (!newTitle) return;
          const newDesc = prompt("Edit course description:", course.description) || "";
          course.title = newTitle;
          course.description = newDesc;
          save();
          render();
        });
      });
    }

    function create() {
      const title = prompt("Course title?");
      if (!title) return;
      const description = prompt("Course description?") || "";
      courses.push({ id: crypto.randomUUID(), title, description });
      save();
      render();
    }

    return { init, create };
  })();

  /* =========================
     INIT
  ========================= */
  showPage("dashboard");

});

