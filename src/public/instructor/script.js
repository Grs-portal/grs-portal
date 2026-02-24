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
    function openModal() {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      form.reset();
      forceDraft = false;
      document.body.style.overflow = "";
    }

    // Close modal via outside click
    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal();
    });

    // Close modal via ESC
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
        qs("#createCourseBtn").onclick = openModal;
        return;
      }
    
      container.innerHTML = courses.map(c => `
        <div class="course-card cursor-pointer relative"
             data-id="${c.id}">
             
          <div class="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${getStatusClass(c.status)}">
            ${formatStatus(c.status)}
          </div>
    
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
        type: qs("#courseLocation").value === "in-person" ? null : qs("#courseType").value,
        chapters: qs("#courseChapters").value,
        previewTitle: qs("#coursePreview").value,
        status: finalStatus
      };

      create(data);
      closeModal();
    });

    /* ===== DRAFT BUTTON ===== */
    qs("#saveDraftBtn").onclick = () => {
      forceDraft = true;
      form.requestSubmit();
    };

    /* ===== CONDITIONAL LOGIC ===== */
    qs("#courseLocation").addEventListener("change", e => {
      const typeWrapper = qs("#typeWrapper");
      typeWrapper.style.display = e.target.value === "in-person" ? "none" : "block";
    });

    /* ===== HELPERS ===== */
    function formatStatus(status) {
      return status.replace("-", " ").toUpperCase();
    }

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

  const container = document.querySelector("#courseDetailContainer");

  container.innerHTML = `
    <div class="bg-white rounded-2xl overflow-hidden shadow-sm">

      <!-- HERO -->
      <div class="relative h-72 w-full">
        <img src="${course.cover || 'https://via.placeholder.com/1200x400'}"
             class="w-full h-full object-cover">
        <button id="editCourseTopBtn"
          class="absolute top-4 right-4 bg-black text-white px-4 py-2 rounded-xl text-sm">
          Edit Course
        </button>
      </div>

      <!-- CONTENT -->
      <div class="p-8">

        <h1 class="text-3xl font-bold mb-2">${course.title}</h1>

        <span class="inline-block bg-gray-100 px-3 py-1 rounded-full text-xs mb-4">
          ${course.type || "Course"}
        </span>

        <p class="text-gray-700 mb-6">${course.description}</p>

        <!-- TEACHER -->
        <div class="flex items-center gap-4 mb-8">
          <img src="${localStorage.getItem("userPhoto") || 'https://via.placeholder.com/60'}"
               class="w-14 h-14 rounded-full object-cover">
          <span class="font-semibold">
            ${localStorage.getItem("userName") || "Instructor"}
          </span>
        </div>

        <!-- INFO BLOCKS -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div class="glass p-4 rounded-xl text-center">
            <div class="text-xl font-bold">${course.durationValue || 0}</div>
            <div class="text-xs uppercase opacity-60">Duration</div>
          </div>

          <div class="glass p-4 rounded-xl text-center">
            <div class="text-xl font-bold">${course.chapters?.length || 0}</div>
            <div class="text-xs uppercase opacity-60">Chapters</div>
          </div>

          <div class="glass p-4 rounded-xl text-center">
            <div class="text-xs font-semibold">${course.location}</div>
            <div class="text-xs uppercase opacity-60">Location</div>
          </div>

          <div class="glass p-4 rounded-xl text-center">
            <div class="text-xs font-semibold">${course.type || "-"}</div>
            <div class="text-xs uppercase opacity-60">Type</div>
          </div>
        </div>

        <!-- CHAPTERS -->
        <div class="mb-12">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Chapters</h2>
            <button id="addChapterBtn"
              class="bg-green-600 text-white px-4 py-2 rounded-xl text-sm">
              Add Chapter
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${(course.chapters || []).map(ch => `
              <div class="bg-gray-50 rounded-xl overflow-hidden relative cursor-pointer">
                <img src="${ch.cover || 'https://via.placeholder.com/300x200'}"
                     class="w-full h-32 object-cover">

                ${ch.preview
                  ? `<span class="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Preview
                     </span>`
                  : `<span class="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded">
                      Locked
                     </span>`}

                <div class="p-3">
                  <h4 class="font-semibold">${ch.title}</h4>
                  <p class="text-xs opacity-60">${ch.duration}</p>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- REVIEWS -->
        <div>
          <h2 class="text-xl font-bold mb-4">Reviews</h2>

          <div id="reviewSummary" class="mb-6"></div>

          <div id="reviewsList"></div>
        </div>

      </div>
    </div>
  `;

  renderReviewsSection(course);
  showPage("course-detail");
}


 //====== Reviews 
  function renderReviewsSection(course) {
  const reviews = course.reviews || [];
  const total = reviews.length;

  const avg = total === 0
    ? 0
    : (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1);

  document.querySelector("#reviewSummary").innerHTML = `
    <div class="flex items-center gap-4 text-lg">
      <strong>${avg}</strong>
      <span>${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))}</span>
      <span class="opacity-60">(${total} reviews)</span>
    </div>
  `;

  const list = document.querySelector("#reviewsList");

  list.innerHTML = reviews.map(r => `
    <div class="bg-gray-50 p-4 rounded-xl mb-4">
      <strong>${r.name}</strong>
      <div>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
      <p class="mt-2">${r.comment}</p>

      ${r.reply ? `
        <div class="bg-green-50 p-3 rounded-lg mt-3">
          <strong>Reply:</strong>
          <p>${r.reply}</p>
        </div>
      ` : `
        <button class="replyBtn mt-3 text-sm text-green-700 underline">
          Reply
        </button>
      `}
    </div>
  `).join("");
}

  /* =========================
     INIT
  ========================= */
  buildCoursesSidebar();
  showPage("dashboard");
});


