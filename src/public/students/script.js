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

  // Profile dropdown
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
  const continueCourses = qs("#continueCourses");
  const coursesGridFull = qs("#coursesGridFull");
  const assignmentsList = qs("#assignmentsList");

  const activeCoursesCount = qs("#activeCoursesCount");
  const homeworkCount = qs("#homeworkCount");

  // refresh buttons from the HTML I sent
  qs("#refreshCoursesBtn")?.addEventListener("click", () => loadAll(true).then(renderCoursesPage));
  qs("#refreshAssignmentsBtn")?.addEventListener("click", () => loadAll(true).then(renderAssignmentsPage));

  // ---------- Cards ----------
  function courseCard(c) {
    const title = escapeHtml(c.title);
    const desc = escapeHtml(c.description || "");

    return `
      <div class="card">
        <h4 class="font-black leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>

        <div class="mt-3 w-full bg-black/10 rounded-full h-2.5">
          <div class="h-2.5 rounded-full bg-black/60" style="width: 0%"></div>
        </div>
        <p class="text-xs opacity-70 mt-2">0% Complete</p>

        <button class="mt-4 w-full rounded-xl bg-[var(--soft-green)] hover:bg-[var(--soft-green-dark)] text-[var(--text-dark)] font-black py-2 transition">
          Continue
        </button>
      </div>
    `;
  }

  function homeworkCard(h) {
    const title = escapeHtml(h.title);
    const desc = escapeHtml(h.description || "");
    const by = escapeHtml(h.submitted_by || "N/A");
    const course = escapeHtml(h.course || "N/A");

    return `
      <div class="card">
        <h4 class="font-black leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>
        <p class="text-xs opacity-70 mt-3">Course: ${course} · By: ${by}</p>

        <button class="mt-4 w-full rounded-xl bg-white/70 hover:bg-white text-[var(--text-dark)] font-black py-2 transition border border-black/10">
          View
        </button>
      </div>
    `;
  }

  // ---------- Data ----------
  let cacheCourses = [];
  let cacheHomework = [];

  async function loadAll(force = false) {
    if (!force && cacheCourses.length && cacheHomework.length) return;

    try {
      const [coursesRes, hwRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/homework"),
      ]);

      cacheCourses = (await coursesRes.json()) || [];
      cacheHomework = (await hwRes.json()) || [];

      if (activeCoursesCount) activeCoursesCount.textContent = cacheCourses.length;
      if (homeworkCount) homeworkCount.textContent = cacheHomework.length;
    } catch (err) {
      console.error(err);
      cacheCourses = [];
      cacheHomework = [];
      if (activeCoursesCount) activeCoursesCount.textContent = "0";
      if (homeworkCount) homeworkCount.textContent = "0";
    }
  }

  // ---------- Render ----------
  async function renderDashboard() {
    await loadAll();
    if (continueCourses) {
      continueCourses.innerHTML = cacheCourses.slice(0, 4).map(courseCard).join("");
    }
  }

  async function renderCoursesPage() {
    await loadAll();
    if (coursesGridFull) {
      coursesGridFull.innerHTML = cacheCourses.map(courseCard).join("");
    }
  }

  async function renderAssignmentsPage() {
    await loadAll();
    if (assignmentsList) {
      assignmentsList.innerHTML = cacheHomework.map(homeworkCard).join("");
    }
  }

  // ---------- Boot ----------
  qs("#y") && (qs("#y").textContent = new Date().getFullYear());
  showPage("dashboard");
});
