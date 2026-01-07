// manager.js
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login.html";

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];

  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className = "fixed bottom-4 right-4 px-4 py-2 rounded text-white shadow";
    t.style.background = color;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  const esc = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const managerRoleHeader = () => ({
    "x-role": localStorage.getItem("role") || "",
  });

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (!localStorage.getItem("isLoggedIn")) {
      location.href = LOGIN;
      return;
    }

    if (localStorage.getItem("role") !== "manager") {
      location.href = LOGIN;
      return;
    }

    const name = localStorage.getItem("userName") || "Manager";
    const userNameEl = qs("#userName");
    if (userNameEl) userNameEl.textContent = name;

    const y = qs("#y");
    if (y) y.textContent = new Date().getFullYear();

    setupNav();
    setupProfile();
    setupMobileSidebar();
    bindButtons();

    // default load
    await loadDashboard();
  }

  function logout() {
    localStorage.clear();
    location.href = LOGIN;
  }

  function setupProfile() {
    const avatar = qs("#userAvatar");
    const menu = qs("#profileMenu");
    const logoutBtn = qs("#logoutBtn"); // ✅ matches your manager.html

    avatar?.addEventListener("click", () => {
      menu?.classList.toggle("hidden");
    });

    logoutBtn?.addEventListener("click", logout);

    // sidebar logout link
    qs("#sidebarLogout")?.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });

    // click outside closes menu
    document.addEventListener("click", (e) => {
      if (!qs("#topAvatarWrap")?.contains(e.target)) {
        menu?.classList.add("hidden");
      }
    });
  }

  function setupMobileSidebar() {
    const menuBtn = qs("#menuBtn");
    const sidebar = qs("#sidebar");
    const overlay = qs("#overlay");

    if (!menuBtn || !sidebar || !overlay) return;

    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("-translate-x-full");
      overlay.classList.toggle("hidden");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
    });
  }

  function setupNav() {
    const pages = qsa(".page-section");

    qsa(".nav-item").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const page = btn.dataset.page;
        if (!page) return;

        pages.forEach((p) => p.classList.add("hidden"));
        qs(`#${page}`)?.classList.remove("hidden");

        qsa(".nav-item").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        if (page === "dashboard") await loadDashboard();
        if (page === "students") await loadStudents();
        if (page === "submitted-homework") await loadHomework();
        if (page === "users") await loadUsers(); // ✅ users page loads here
      });
    });
  }

  function bindButtons() {
    // refresh users button
    qs("#refreshUsersBtn")?.addEventListener("click", loadUsers);
  }

  // ---------------- DASHBOARD ----------------
  async function loadDashboard() {
    const [courses, hw] = await Promise.all([fetchJSON("/courses"), fetchJSON("/homework")]);

    qs("#activeCoursesCount").textContent = courses.length;
    qs("#toGradeCount").textContent = hw.length;

    const coursesBox = qs("#courses");
    if (!coursesBox) return;

    coursesBox.innerHTML = courses
      .map(
        (c) => `
      <div class="bg-white p-4 rounded shadow flex justify-between items-center">
        <div>
          <div class="font-semibold">${esc(c.title)}</div>
          <div class="text-sm">${esc(c.description || "")}</div>
        </div>
        <button class="text-red-600" data-id="${c.id}">🗑</button>
      </div>
    `
      )
      .join("");

    // bind delete buttons safely (no inline JS)
    coursesBox.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;
        await fetch(`${API}/courses/${id}`, { method: "DELETE" });
        loadDashboard();
      });
    });
  }

  // ---------------- STUDENTS ----------------
  async function loadStudents() {
    const students = await fetchJSON("/students");
    const table = qs("#studentTable");
    if (!table) return;

    table.innerHTML = students
      .map(
        (s) => `
      <tr>
        <td class="px-4 py-2">${esc(s.name)}</td>
        <td class="px-4 py-2">${esc(s.course)}</td>
        <td class="px-4 py-2">${s.grade ?? "-"}</td>
      </tr>
    `
      )
      .join("");
  }

  // ---------------- HOMEWORK ----------------
  async function loadHomework() {
    const hw = await fetchJSON("/homework");
    const list = qs("#homework-list");
    if (!list) return;

    list.innerHTML = hw
      .map(
        (h) => `
      <div class="bg-white p-4 rounded shadow">
        <div class="font-semibold">${esc(h.title)}</div>
        <div class="text-sm">${esc(h.course || "")}</div>
      </div>
    `
      )
      .join("");
  }

  // ---------------- USERS (FIXED) ----------------
  async function loadUsers() {
    const table = qs("#usersTable");
    if (!table) {
      toast("Users table missing in HTML (#usersTable)", "#b91c1c");
      return;
    }

    // IMPORTANT: /api/users requires manager role header
    const res = await fetch(`${API}/users`, {
      headers: {
        ...managerRoleHeader(),
      },
    });

    // If forbidden, show it instead of silently failing
    if (res.status === 403) {
      table.innerHTML = "";
      toast("Forbidden: /api/users (missing x-role header)", "#b91c1c");
      return;
    }

    const users = await safeJson(res);

    if (!Array.isArray(users)) {
      table.innerHTML = "";
      toast("Failed to load users", "#b91c1c");
      return;
    }

    table.innerHTML = users
      .map(
        (u) => `
      <tr class="border-t">
        <td class="px-4 py-2">${esc(u.username)}</td>
        <td class="px-4 py-2">${esc(u.name || "")}</td>
        <td class="px-4 py-2">${esc(u.role || "")}</td>
        <td class="px-4 py-2 text-right">
          <button class="btn-del-user px-3 py-1 rounded bg-red-100 text-red-600"
            data-username="${esc(u.username)}">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");

    table.querySelectorAll(".btn-del-user").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.username;
        if (!confirm(`Delete ${username}?`)) return;

        const del = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
          method: "DELETE",
          headers: {
            ...managerRoleHeader(),
          },
        });

        const out = await safeJson(del);

        if (!del.ok || !out?.success) {
          toast(out?.message || "Delete failed", "#b91c1c");
          return;
        }

        toast("User deleted", "#b91c1c");
        loadUsers();
      });
    });
  }

  // ---------------- UTIL ----------------
  async function fetchJSON(path) {
    try {
      const r = await fetch(API + path);
      if (!r.ok) return [];
      return await r.json();
    } catch {
      return [];
    }
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
})();
