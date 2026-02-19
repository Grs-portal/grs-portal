document.addEventListener("DOMContentLoaded", () => {
  const LOGIN_PATH = "/homepage/login.html";
  const API = "/api";

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

  async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
  }

  // ---------- Theme ----------
  function applyTheme(theme) {
    const t = theme || localStorage.getItem("theme") || "glass";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  }

  function setupThemeUI() {
    applyTheme();

    const profileWrap = qs("#profileWrap");
    const themeBtn = qs("#themeBtn");
    const profileMenu = qs("#profileMenu");

    // theme button opens the SAME dropdown
    themeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      profileMenu?.classList.toggle("hidden");
    });

    // theme pick buttons
    qsa(".themePick").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyTheme(b.dataset.theme);
        profileMenu?.classList.add("hidden");
      });
    });

    // click outside closes dropdown
    document.addEventListener("click", (e) => {
      if (!profileWrap || !profileMenu) return;
      if (!profileWrap.contains(e.target)) profileMenu.classList.add("hidden");
    });
  }

  // ---------- UI: name + avatar + logout ----------
  const name = localStorage.getItem("userName") || "Student";

  const userNameEl = qs("#userName");
  const avatarEl = qs("#userAvatar");
  const profileMenu = qs("#profileMenu");

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

  // Avatar click toggles same dropdown
  avatarEl?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu?.classList.toggle("hidden");
  });

  // ---------- Sidebar mobile toggle ----------
  const sidebar = qs("#sidebar");
  const overlay = qs("#overlay");
  const menuBtn = qs("#menuBtn");

  function closeSidebar() {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function toggleSidebar() {
    if (!sidebar || !overlay) return;
    const closed = sidebar.classList.contains("-translate-x-full");
    if (closed) {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    } else {
      closeSidebar();
    }
  }

  menuBtn?.addEventListener("click", toggleSidebar);
  overlay?.addEventListener("click", closeSidebar);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      qs("#notifMenu")?.classList.add("hidden");
      qs("#profileMenu")?.classList.add("hidden");
    }
  });

  // ---------- Navigation ----------
  const pages = qsa(".page-section");
  const navItems = qsa(".nav-item");

  function showPage(id) {
    pages.forEach((p) => p.classList.add("hidden"));
    qs(`#${id}`)?.classList.remove("hidden");

    navItems.forEach((i) => i.classList.remove("active"));
    navItems.find((i) => i.dataset.page === id)?.classList.add("active");

    closeSidebar();

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

  qs("#refreshCoursesBtn")?.addEventListener("click", () =>
    loadAll(true).then(renderCoursesPage)
  );
  qs("#refreshAssignmentsBtn")?.addEventListener("click", () =>
    loadAll(true).then(renderAssignmentsPage)
  );

  // ---------- Cards ----------
  function courseCard(c) {
    const title = escapeHtml(c.title);
    const desc = escapeHtml(c.description || "");

    return `
      <div class="card p-4">
        <h4 class="font-extrabold leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>

        <div class="mt-3 w-full bg-black/10 rounded-full h-2.5">
          <div class="h-2.5 rounded-full bg-black/50" style="width: 0%"></div>
        </div>
        <p class="text-xs opacity-70 mt-2">0% Complete</p>

        <button class="mt-4 w-full rounded-xl bg-white/10 hover:bg-white/15 text-[color:var(--text)] font-extrabold py-2 transition border border-white/15">
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
      <div class="card p-4">
        <h4 class="font-extrabold leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>
        <p class="text-xs opacity-70 mt-3">Course: ${course} · By: ${by}</p>

        <button class="mt-4 w-full rounded-xl bg-white/10 hover:bg-white/15 text-[color:var(--text)] font-extrabold py-2 transition border border-white/15">
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
        fetch(`${API}/courses`),
        fetch(`${API}/homework`),
      ]);

      cacheCourses = (await safeJson(coursesRes)) || [];
      cacheHomework = (await safeJson(hwRes)) || [];

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

  // ---------- Notifications ----------
  function setupNotificationsUI() {
    const btn = qs("#notifBtn");
    const menu = qs("#notifMenu");
    const wrap = qs("#notifWrap");

    btn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      menu?.classList.toggle("hidden");
      if (menu && !menu.classList.contains("hidden")) await loadNotifications();
    });

    document.addEventListener("click", (e) => {
      if (!wrap || !menu) return;
      if (!wrap.contains(e.target)) menu.classList.add("hidden");
    });

    qs("#notifReadAll")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const role = localStorage.getItem("role") || "";
      const username = localStorage.getItem("username") || "";
      await fetch(`${API}/notifications/read-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, username }),
      });
      await loadNotifications();
    });
  }

  async function loadNotifications() {
    const role = localStorage.getItem("role") || "";
    const username = localStorage.getItem("username") || "";
    if (!username) return;

    const res = await fetch(
      `${API}/notifications?role=${encodeURIComponent(role)}&username=${encodeURIComponent(username)}`
    );
    const out = await safeJson(res);
    if (!out?.success) return;

    const items = out.items || [];
    const unreadCount = items.filter((x) => x.unread).length;

    const badge = qs("#notifBadge");
    if (badge) {
      badge.textContent = String(unreadCount);
      badge.classList.toggle("hidden", unreadCount === 0);
    }

    const list = qs("#notifList");
    if (!list) return;

    list.innerHTML = items.map((n) => `
      <div class="px-4 py-3 border-b border-white/10 ${n.unread ? "bg-white/5" : ""}">
        <div class="text-sm font-extrabold">${escapeHtml(n.message || "")}</div>
        <div class="text-xs opacity-70 mt-1">
          ${escapeHtml(n.byName || n.byUsername || "Someone")} · ${escapeHtml(n.byRole || "")} ·
          ${new Date(n.ts).toLocaleString()}
        </div>
      </div>
    `).join("");
  }

  // ---------- Boot ----------
  qs("#y") && (qs("#y").textContent = new Date().getFullYear());

  setupNotificationsUI();
  setupThemeUI(); // ✅ THIS was the missing part when "buttons don't work"
  loadNotifications();
  setInterval(loadNotifications, 15000);

  showPage("dashboard");
});
