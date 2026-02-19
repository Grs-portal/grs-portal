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

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  // ---------- Theme ----------
  function applyTheme(theme) {
    const t = theme || localStorage.getItem("theme") || "glass";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  }

  function setupThemeUI() {
    applyTheme();

    const wrap = qs("#themeWrap");
    const btn = qs("#themeBtn");
    const menu = qs("#themeMenu");

    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      menu?.classList.toggle("hidden");
    });

    qsa(".themePick").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        applyTheme(b.dataset.theme);
        menu?.classList.add("hidden");
      });
    });

    document.addEventListener("click", (e) => {
      if (!wrap || !menu) return;
      if (!wrap.contains(e.target)) menu.classList.add("hidden");
    });
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
  avatarEl?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu?.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!topWrap || !profileMenu) return;
    if (!topWrap.contains(e.target)) profileMenu.classList.add("hidden");
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
      profileMenu?.classList.add("hidden");
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
    if (id === "schedule") renderSchedulePage(); // ✅ added
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

  // ✅ schedule refresh button (exists after you add schedule UI)
  qs("#refreshScheduleBtn")?.addEventListener("click", () => loadSchedule(true).then(renderSchedulePage));

  // ---------- Cards ----------
  function courseCard(c) {
    const title = escapeHtml(c.title);
    const desc = escapeHtml(c.description || "");

    return `
      <div class="card">
        <h4 class="font-semibold leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>

        <div class="mt-3 w-full bg-black/10 rounded-full h-2.5">
          <div class="h-2.5 rounded-full bg-black/50" style="width: 0%"></div>
        </div>
        <p class="text-xs opacity-70 mt-2">0% Complete</p>

        <button class="mt-4 w-full rounded-xl bg-white/70 hover:bg-white text-[var(--text-dark)] font-semibold py-2 transition border border-black/10">
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
        <h4 class="font-semibold leading-tight">${title}</h4>
        <p class="text-sm opacity-80 mt-1">${desc}</p>
        <p class="text-xs opacity-70 mt-3">Course: ${course} · By: ${by}</p>

        <button class="mt-4 w-full rounded-xl bg-white/70 hover:bg-white text-[var(--text-dark)] font-semibold py-2 transition border border-black/10">
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

  // ---------- Schedule Data ----------
  let cacheSchedule = [];

  async function loadSchedule(force = false) {
    if (!force && cacheSchedule.length) return;

    const username = localStorage.getItem("username") || "";
    const role = localStorage.getItem("role") || "student";
    if (!username) {
      cacheSchedule = [];
      return;
    }

    try {
      const res = await fetch(`${API}/schedule?role=${encodeURIComponent(role)}&username=${encodeURIComponent(username)}`);
      const out = await safeJson(res);
      if (!out?.success) {
        cacheSchedule = [];
        return;
      }
      cacheSchedule = Array.isArray(out.items) ? out.items : [];
    } catch (e) {
      console.error(e);
      cacheSchedule = [];
    }
  }

  function scheduleRow(ev) {
    const title = escapeHtml(ev.title || "Event");
    const course = escapeHtml(ev.course || "");
    const location = escapeHtml(ev.location || "");
    const notes = escapeHtml(ev.notes || "");

    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const time = `${start.toLocaleString()}${isNaN(end.getTime()) ? "" : " – " + end.toLocaleTimeString()}`;

    return `
      <div class="p-3 rounded-xl border border-black/10 bg-white/70">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">${title}</div>
            <div class="text-xs opacity-70 mt-1">${escapeHtml(time)}</div>
            ${course ? `<div class="text-xs opacity-70 mt-1">Course: ${course}</div>` : ""}
            ${location ? `<div class="text-xs opacity-70 mt-1">Location: ${location}</div>` : ""}
            ${notes ? `<div class="text-xs opacity-70 mt-1">${notes}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  async function renderSchedulePage() {
    await loadSchedule();

    const todayBox = qs("#scheduleToday");
    const upcomingBox = qs("#scheduleUpcoming");
    const empty = qs("#scheduleEmpty");

    if (!todayBox || !upcomingBox || !empty) return;

    const now = new Date();
    const items = cacheSchedule
      .filter(e => e?.start)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const today = items.filter(e => isSameDay(new Date(e.start), now));
    const upcoming = items.filter(e => new Date(e.start) > now).slice(0, 20);

    todayBox.innerHTML = today.length ? today.map(scheduleRow).join("") : `<div class="text-sm opacity-70">No events today.</div>`;
    upcomingBox.innerHTML = upcoming.length ? upcoming.map(scheduleRow).join("") : `<div class="text-sm opacity-70">No upcoming events.</div>`;

    empty.classList.toggle("hidden", items.length !== 0);
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
      <div class="px-4 py-3 border-b border-black/5 ${n.unread ? "bg-green-50" : ""}">
        <div class="text-sm font-semibold">${escapeHtml(n.message || "")}</div>
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
  loadNotifications();
  setInterval(loadNotifications, 15000);

  showPage("dashboard");
});
