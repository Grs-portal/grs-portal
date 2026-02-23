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
      <div class="p-4 space-y-4 bg-white h-full overflow-y-auto">
        <input id="searchCourse" placeholder="Search courses..."
          class="w-full border rounded px-3 py-2">

        <select id="filterCourse" class="w-full border rounded px-3 py-2">
          <option>All types</option>
        </select>

        <button id="newCourseBtn"
          class="w-full bg-black text-white rounded px-3 py-2">
          + New Course
        </button>
      </div>
    `;

    qs("#newCourseBtn").addEventListener("click", () => Courses.create());
  }

  buildCoursesSidebar();

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
