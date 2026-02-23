document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     HELPERS
  ===================================================== */
  const qs  = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];

  const mainSidebar    = qs("#mainSidebar");
  const coursesSidebar = qs("#coursesSidebar");
  const overlay        = qs("#overlay");
  const toggleBtn      = qs("#sidebarToggle");
  const menuBtn        = qs("#menuBtn");

  /* =====================================================
     AUTH
  ===================================================== */
  const LOGIN_URL = "/homepage/login.html";
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  if (!isLoggedIn || role !== "instructor") {
    window.location.replace(LOGIN_URL);
    return;
  }

  /* =====================================================
     SIDEBAR ENGINE  (🔥 main fix)
     Only these functions touch sidebars
  ===================================================== */

  function closeAllSidebars() {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.remove("active");
    overlay.classList.add("hidden");
    toggleBtn.classList.add("hidden");
  }

  function openMainSidebar() {
    closeAllSidebars();
    mainSidebar.classList.add("active");
  }

  function openCoursesSidebar() {
    closeAllSidebars();
    coursesSidebar.classList.add("active");
    toggleBtn.classList.remove("hidden");
    overlay.classList.remove("hidden");
  }

  /* ---------- mobile menu ---------- */
  menuBtn.addEventListener("click", () => {
    if (mainSidebar.classList.contains("active")) {
      closeAllSidebars();
      overlay.classList.remove("hidden");
    } else {
      openMainSidebar();
    }
  });

  toggleBtn.addEventListener("click", openMainSidebar);
  overlay.addEventListener("click", openMainSidebar);

  /* =====================================================
     ROUTER  (🔥 now controls sidebar automatically)
  ===================================================== */

  function showPage(id) {

    /* hide pages */
    qsa(".page-section").forEach(p => p.classList.add("hidden"));

    /* show page */
    qs("#" + id)?.classList.remove("hidden");

    /* nav highlight */
    qsa(".nav-item").forEach(a =>
      a.classList.toggle("active", a.dataset.page === id)
    );

    /* decide sidebar */
    if (id === "my-courses") {
      openCoursesSidebar();
      Courses.init();
    } else {
      openMainSidebar();
    }
  }

  /* nav clicks */
  qsa(".nav-item").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  /* =====================================================
     BUILD COURSES SIDEBAR
  ===================================================== */

  function buildCoursesSidebar() {
    coursesSidebar.innerHTML = `
      <div class="p-4 space-y-4 bg-white h-full overflow-y-auto">
        <input placeholder="Search courses..."
          class="w-full border rounded px-3 py-2">

        <select class="w-full border rounded px-3 py-2">
          <option>All types</option>
        </select>

        <button id="newCourseBtn"
          class="w-full bg-black text-white rounded px-3 py-2">
          + New Course
        </button>
      </div>
    `;
  }

  buildCoursesSidebar();

  /* =====================================================
     COURSES MODULE  (same logic, cleaned)
  ===================================================== */

  const Courses = (() => {

    const KEY = "instructor_courses";
    let courses = JSON.parse(localStorage.getItem(KEY) || "[]");

    const save = () =>
      localStorage.setItem(KEY, JSON.stringify(courses));

    function init() {
      render();
    }

    function render() {
      const container = qs("#my-courses");

      if (!courses.length) {
        container.innerHTML = `
          <div class="glass p-10 rounded-2xl text-center fade-in">
            <p>No courses yet</p>
            <button id="createCourse" class="btn-primary mt-4">
              Create first course
            </button>
          </div>
        `;

        qs("#createCourse").onclick = create;
        return;
      }

      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 fade-in">
          ${courses.map(c => `
            <div class="glass p-4 rounded-2xl cursor-pointer hover:scale-[1.02] transition"
              data-id="${c.id}">
              <div class="font-semibold">${c.title}</div>
              <div class="text-xs opacity-70">${c.description}</div>
            </div>
          `).join("")}
        </div>
      `;

      qsa("[data-id]").forEach(card => {
        card.onclick = () => alert("Course detail later");
      });
    }

    function create() {
      const title = prompt("Course title?");
      if (!title) return;

      courses.push({
        id: crypto.randomUUID(),
        title,
        description: ""
      });

      save();
      render();
    }

    return { init };

  })();

  /* =====================================================
     INIT
  ===================================================== */

  showPage("dashboard");

});
