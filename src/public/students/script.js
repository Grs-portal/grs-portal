document.addEventListener("DOMContentLoaded", () => {
  const LOGIN_PATH = "/homepage/login.html";

  // ---------- Auth guard ----------
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.endsWith("login.html");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  if (!isLoginPage && (!isLoggedIn || role !== "student")) {
    window.location.replace(LOGIN_PATH);
    return;
  }

  // ---------- Helpers ----------
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "S";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }

  // ---------- UI: name + avatar + logout ----------
  const name = localStorage.getItem("userName") || "Student";
  const userNameEl = qs("#userName");
  const avatarEl = qs("#userAvatar");

  if (userNameEl) userNameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = initials(name);

  function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    window.location.replace(LOGIN_PATH);
  }

  qs("#logoutBtn")?.addEventListener("click", logout);
  qs("#sidebarLogout")?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  // Profile dropdown toggle (if present)
  const topWrap = qs("#topAvatarWrap");
  const profileMenu = qs("#profileMenu");
  avatarEl?.addEventListener("click", () => profileMenu?.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!topWrap || !profileMenu) return;
    if (!topWrap.contains(e.target)) profileMenu.classList.add("hidden");
  });

  // ---------- Sidebar mobile toggle ----------
  const sidebar = qs("#sidebar");
  const overlay = qs("#overlay");
  const menuBtn = qs("#menuBtn");

  menuBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("-translate-x-full");
    overlay?.classList.toggle("hidden");
  });

  overlay?.addEventListener("click", () => {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  });

  // ---------- Navigation ----------
  const pages = qsa(".page-section");
  const navItems = qsa(".nav-item");

  function showPage(id) {
    pages.forEach((p) => p.classList.add("hidden"));
    qs(`#${id}`)?.classList.remove("hidden");

    navItems.forEach((i) => i.classList.remove("active"));
    navItems.find((i) => i.dataset.page === id)?.classList.add("active");

    // close on mobile
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");

    // load data when switching pages
    if (id === "dashboard") renderDashboard();
    if (id === "courses") renderCoursesPage();
    if (id === "assignments") renderAssignmentsPage();
  }

  navItems.forEach((it) => {
    it.addEventListener("click", (e) => {
      e.preventDefault();
      const page = it.dataset.page;
      if (page) showPage(page);
    });
  });

  // ---------- Elements ----------
  const continueCourses = qs("#continueCourses"); // dashboard grid
  const coursesSection = qs("#courses"); // full courses page (section itself)
  const assignmentsList = qs("#assignmentsList");

  const activeCoursesCount = qs("#activeCoursesCount");
  const totalCoursesCount = qs("#totalCoursesCount"); // in your new HTML
  const homeworkCount = qs("#homeworkCount"); // if you still have it somewhere

  qs("#refreshBtn")?.addEventListener("click", () => loadAll(true));
  qs("#refreshAssignmentsBtn")?.addEventListener("click", () => loadAll(true));

  // ---------- Card UI ----------
  function courseCard(c) {
    const title = escapeHtml(c.title);
    const desc = escapeHtml(c.description || "");

    return `
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 class="font-semibold leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>
        <div class="mt-3 w-full bg-gray-200 rounded-full h-2.5">
          <div class="h-2.5 rounded-full bg-indigo-600" style="width: 0%"></div>
        </div>
        <p class="text-xs opacity-70 mt-2">0% Complete</p>
        <button class="mt-4 w-full bg-gray-100 hover:bg-[rgba(191,227,180,.65)] text-black font-semibold py-2 rounded-xl transition">
          Continue
        </button>
      </div>
    `;
  }

  function homeworkCard(h) {
    const title = escapeHtml(h.title);
    const desc = escapeHtml(h.description || "");
    const by = escapeHtml(h.submitted_by || "N/A");
    const course = escapeHtml(h.course || h.course_title || "N/A");

    return `
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 class="font-semibold leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>
        <p class="text-xs opacity-70 mt-3">Course: ${course} · By: ${by}</p>
        <button class="mt-4 w-full bg-gray-100 hover:bg-[rgba(191,227,180,.65)] text-black font-semibold py-2 rounded-xl transition">
          View
        </button>
      </div>
    `;
  }

  // ---------- Data cache ----------
  let cacheCourses = null;
  let cacheHomework = null;

  async function loadAll(force = false) {
    try {
      if (!force && Array.isArray(cacheCourses) && Array.isArray(cacheHomework)) return;

      const [coursesRes, hwRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/homework"),
      ]);

      cacheCourses = (await coursesRes.json()) || [];
      cacheHomework = (await hwRes.json()) || [];

      if (activeCoursesCount) activeCoursesCount.textContent = cacheCourses.length;
      if (totalCoursesCount) totalCoursesCount.textContent = cacheCourses.length;
      if (homeworkCount) homeworkCount.textContent = cacheHomework.length;
    } catch (err) {
      console.error("Student load error:", err);
      // no visible grey text on purpose
      cacheCourses = [];
      cacheHomework = [];
      if (activeCoursesCount) activeCoursesCount.textContent = "0";
      if (totalCoursesCount) totalCoursesCount.textContent = "0";
      if (homeworkCount) homeworkCount.textContent = "0";
    }
  }

  // ---------- Render ----------
  async function renderDashboard() {
    await loadAll();

    // show a "continue" grid (you can later filter/enrolled only if you add that system)
    if (continueCourses) {
      continueCourses.innerHTML = (cacheCourses || []).slice(0, 4).map(courseCard).join("");
    }
  }

  async function renderCoursesPage() {
    await loadAll();

    if (!coursesSection) return;

    // full courses list inside the section
    coursesSection.innerHTML = `
      <div class="content-box min-h-[60vh]">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold">My Courses</h2>
          <button id="refreshCoursesBtn" class="btn-primary">Refresh</button>
        </div>

        <div id="coursesGridFull" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      </div>
    `;

    const grid = qs("#coursesGridFull");
    if (grid) grid.innerHTML = (cacheCourses || []).map(courseCard).join("");

    // refresh handler (since we injected the button)
    qs("#refreshCoursesBtn")?.addEventListener("click", async () => {
      await loadAll(true);
      const g = qs("#coursesGridFull");
      if (g) g.innerHTML = (cacheCourses || []).map(courseCard).join("");
    });
  }

  async function renderAssignmentsPage() {
    await loadAll();

    if (assignmentsList) {
      assignmentsList.innerHTML = (cacheHomework || []).map(homeworkCard).join("");
    }
  }

  // ---------- Boot ----------
  showPage("dashboard");
});
