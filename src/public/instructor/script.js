// /instructor/script.js
document.addEventListener("DOMContentLoaded", () => {
  const LOGIN_URL = "/homepage/login.html";
  const API = "/api";

  // ---- Auth guard ----
  const path = window.location.pathname;
  const isLoginPage = path.endsWith("login.html");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  if (!isLoginPage && (!isLoggedIn || role !== "instructor")) {
    window.location.replace(LOGIN_URL);
    return;
  }

  // ---- helpers ----
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];
  const esc = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className =
      "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg z-[9999]";
    t.style.background = color;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  const actorHeaders = () => ({
    "x-role": localStorage.getItem("role") || "",
    "x-username": localStorage.getItem("username") || "",
    "x-name": localStorage.getItem("userName") || "",
  });

  const jsonHeaders = () => ({
    ...actorHeaders(),
    "Content-Type": "application/json",
  });

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function fetchJSON(path) {
    try {
      const r = await fetch(API + path);
      if (!r.ok) return [];
      return await r.json();
    } catch {
      return [];
    }
  }

  // ---- Top UI ----
  if (qs("#y")) qs("#y").textContent = new Date().getFullYear();
  const displayName = localStorage.getItem("userName") || "Instructor";
  if (qs("#userName")) qs("#userName").textContent = displayName;
  const avatar = qs("#userAvatar");
  if (avatar) avatar.textContent = (displayName.trim()[0] || "I").toUpperCase();

  // ---- Sidebar (mobile) ----
  const sidebar = qs("#sidebar");
  const overlay = qs("#overlay");

  function openSidebar() {
    sidebar?.classList.remove("-translate-x-full");
    overlay?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
    document.body.style.overflow = "";
  }

  qs("#menuBtn")?.addEventListener("click", () => {
    if (!sidebar) return;
    const isClosed = sidebar.classList.contains("-translate-x-full");
    isClosed ? openSidebar() : closeSidebar();
  });
  overlay?.addEventListener("click", closeSidebar);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      qs("#notifMenu")?.classList.add("hidden");
      qs("#profileMenu")?.classList.add("hidden");
    }
  });

  // ---- Navigation ----
  qsa(".nav-item").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(link.dataset.page);
      closeSidebar();
    });
  });

  // ---- Logout ----
  function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    window.location.replace(LOGIN_URL);
  }
  qs("#logoutBtn")?.addEventListener("click", logout);
  qs("#sidebarLogout")?.addEventListener("click", logout);

  // ---- Profile dropdown ----
  const topAvatarWrap = qs("#topAvatarWrap");
  const profileMenu = qs("#profileMenu");

  avatar?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu?.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (topAvatarWrap && profileMenu && !topAvatarWrap.contains(e.target)) {
      profileMenu.classList.add("hidden");
    }
  });

  // ---- Modals ----
  function closeModal() {
    document.getElementById("modalBg")?.remove();
  }

  function showModal(innerHTML) {
    closeModal();
    const modalBg = document.createElement("div");
    modalBg.id = "modalBg";
    modalBg.className =
      "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50";
    modalBg.innerHTML = `
      <div class="bg-white rounded-2xl p-6 shadow-lg w-[92%] max-w-md">
        ${innerHTML}
      </div>
    `;
    document.body.appendChild(modalBg);
    modalBg.addEventListener("click", (e) => {
      if (e.target === modalBg) closeModal();
    });
    document.getElementById("cancelModal")?.addEventListener("click", closeModal);
  }

  // ---- Notifications UI ----
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
      `${API}/notifications?role=${encodeURIComponent(
        role
      )}&username=${encodeURIComponent(username)}`
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

    list.innerHTML = items
      .map(
        (n) => `
      <div class="px-4 py-3 border-b border-black/5 ${
        n.unread ? "bg-green-50" : ""
      }">
        <div class="text-sm font-bold">${esc(n.message || "")}</div>
        <div class="text-xs opacity-70 mt-1">
          ${esc(n.byName || n.byUsername || "Someone")} · ${esc(
        n.byRole || ""
      )} · ${new Date(n.ts).toLocaleString()}
        </div>
      </div>
    `
      )
      .join("");
  }

  // ---- Dashboard / Students / Homework ----
  async function loadDashboard() { /* ... keep your existing ... */ }
  async function loadStudents() { /* ... keep your existing ... */ }
  async function loadHomework() { /* ... keep your existing ... */ }
  function openCourseModal() { /* ... keep your existing ... */ }

  // ---- My Courses: full integration with courses.js logic ----
  const COURSE_API = "/api/courses";

  async function loadMyCourses() {
    const container = qs("#myCoursesContainer");
    if (!container) return;

    container.innerHTML = "Loading courses...";
    try {
      const res = await fetch(COURSE_API);
      if (!res.ok) throw new Error("Failed to fetch courses");
      const courses = await res.json();

      container.innerHTML = "";
      courses.forEach((course) => {
        const card = document.createElement("div");
        card.className = "course-card";
        card.innerHTML = `
          <img src="${course.cover}" alt="${course.title}" class="course-cover">
          <div class="course-info">
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <span class="badge">${course.courseType}</span>
            <button class="view-course">View</button>
          </div>
        `;
        // View course button
        card.querySelector(".view-course").addEventListener("click", () => {
          window.location.href = `/instructor/course_detail.html?id=${course.id}`;
        });

        container.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = "Failed to load courses.";
    }
  }

  // ---- Page router + nav ----
  function showPage(id) {
    qsa(".page-section").forEach((p) => p.classList.add("hidden"));
    qs(`#${id}`)?.classList.remove("hidden");

    qsa(".nav-item").forEach((a) => {
      a.classList.toggle("active", a.dataset.page === id);
    });

    if (id === "dashboard") loadDashboard();
    if (id === "students") loadStudents();
    if (id === "submitted") loadHomework();
    if (id === "my-courses") loadMyCourses();
  }

  qs("#addCourseBtn")?.addEventListener("click", openCourseModal);
  qs("#addHomeworkBtn")?.addEventListener("click", openHomeworkModal);

  setupNotificationsUI();
  loadNotifications();
  setInterval(loadNotifications, 15000);

  showPage("dashboard");
});
