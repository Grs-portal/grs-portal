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

  qsa(".nav-item").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      qsa(".nav-item").forEach((el) => el.classList.remove("active"));
      link.classList.add("active");

      qsa(".page-section").forEach((s) => s.classList.add("hidden"));

      const page = link.dataset.page;
      qs(`#${page}`)?.classList.remove("hidden");

      if (page === "my-courses") loadMyCourses();
      if (page === "dashboard") loadDashboard();
      if (page === "students") loadStudents();
      if (page === "submitted") loadHomework();
    });
  });

  // ---- Logout (top + sidebar) ----
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

  // ---- Upload helper (PDF) ----
  async function uploadPdf(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
    const out = await safeJson(res);
    if (!res.ok || !out?.success) throw new Error(out?.message || "Upload failed");
    return out;
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
    const out = await res.json();
    if (!res.ok || !out?.success) throw new Error(out?.message || "Upload failed");
    return out;
  }

  // ---- Dashboard ----
  async function loadDashboard() {
    const [courses, hw] = await Promise.all([
      fetchJSON("/courses"),
      fetchJSON("/homework"),
    ]);

    if (qs("#activeCoursesCount")) qs("#activeCoursesCount").textContent = courses.length;
    if (qs("#toGradeCount")) qs("#toGradeCount").textContent = hw.length;

    const container = qs("#courses");
    if (!container) return;

    container.innerHTML = courses
      .map(
        (c) => `
      <article class="bg-white rounded-2xl border border-[#A5C8A1]/60 p-4 shadow-sm flex justify-between items-start">
        <div>
          <h4 class="font-semibold">${esc(c.title)}</h4>
          <p class="text-sm opacity-80">${esc(c.description || "")}</p>
          <div class="text-xs opacity-60 mt-1">Type: ${esc(
            c.locationType || "in-person"
          )}</div>
          ${
            c.pdfUrl
              ? `<a class="text-xs underline text-green-800" href="${esc(
                  c.pdfUrl
                )}" target="_blank">PDF: ${esc(c.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="editCourseBtn px-2 py-1 rounded hover:bg-black/5" data-id="${c.id}">✏️</button>
          <button class="deleteCourseBtn px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200" data-id="${c.id}">🗑</button>
        </div>
      </article>
    `
      )
      .join("");

    qsa(".deleteCourseBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this course?")) return;
        const r = await fetch(`${API}/courses/${btn.dataset.id}`, {
          method: "DELETE",
          headers: actorHeaders(),
        });
        if (!r.ok) return toast("Delete failed", "#b91c1c");
        toast("Course deleted", "#b91c1c");
        loadDashboard();
        loadNotifications();
      });
    });

    qsa(".editCourseBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const coursesNow = await fetchJSON("/courses");
        const found = coursesNow.find((x) => String(x.id) === String(id));
        if (found) openEditCourseModal(found);
      });
    });
  }

  // ---- Students ----
  async function loadStudents() { /*... keep existing ...*/ }
  function openEditGradeModal(id, grade) { /*... keep existing ...*/ }

  // ---- Homework ----
  async function loadHomework() { /*... keep existing ...*/ }
  function openHomeworkModal() { /*... keep existing ...*/ }
  function openEditHomeworkModal(hw) { /*... keep existing ...*/ }

  // ---- Create Courses ----
  function openCourseModal() { /*... keep existing ...*/ }

  // ---- My Courses ----
  async function loadMyCourses() {
    const container = qs("#myCoursesContainer");
    if (!container) return;

    const courses = await fetchJSON("/courses");

    if (!courses.length) {
      container.innerHTML = `
        <div class="text-sm opacity-70">
          No courses yet.
        </div>
      `;
      return;
    }

    container.innerHTML = courses.map(c => `
      <div class="bg-white rounded-2xl border border-[#A5C8A1]/60 p-4 shadow-sm">
        <h3 class="font-semibold text-lg">${esc(c.title)}</h3>
        <p class="text-sm opacity-80 mt-1">${esc(c.description || "")}</p>
        <div class="text-xs opacity-60 mt-2">
          ${esc(c.courseType || "in-person")}
        </div>
      </div>
    `).join("");
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

  qsa(".nav-item").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const page = a.dataset.page;
      if (!page) return;
      showPage(page);
      closeSidebar();
    });
  });

  qs("#addCourseBtn")?.addEventListener("click", openCourseModal);
  qs("#addHomeworkBtn")?.addEventListener("click", openHomeworkModal);

  setupNotificationsUI();
  loadNotifications();
  setInterval(loadNotifications, 15000);

  showPage("dashboard");
});
