// manager.js  ✅ FIXED (ready to paste)
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login.html";

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];

  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className = "fixed bottom-4 right-4 px-4 py-2 rounded text-white shadow z-50";
    t.style.background = color;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    // auth
    if (!localStorage.getItem("isLoggedIn")) {
      location.href = LOGIN;
      return;
    }
    if (localStorage.getItem("role") !== "manager") {
      location.href = LOGIN;
      return;
    }

    // header
    const userNameEl = qs("#userName");
    if (userNameEl) userNameEl.textContent = localStorage.getItem("userName") || "Manager";
    const y = qs("#y");
    if (y) y.textContent = new Date().getFullYear();

    // sidebar mobile (optional elements)
    const menuBtn = qs("#menuBtn");
    const sidebar = qs("#sidebar");
    const overlay = qs("#overlay");
    if (menuBtn && sidebar && overlay) {
      menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("-translate-x-full");
        overlay.classList.toggle("hidden");
      });
      overlay.addEventListener("click", () => {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
      });
    }

    setupNav();
    setupProfile();
    bindButtons();

    await loadDashboard();
  }

  // ---------------- PROFILE / LOGOUT ----------------
  function setupProfile() {
    // Works with BOTH HTML versions:
    // - profileMenu contains #logoutBtn (your manager.html)
    // - or profileMenu contains #pm-logout (older)
    const avatar = qs("#userAvatar");
    const menu = qs("#profileMenu");
    if (avatar && menu) {
      avatar.addEventListener("click", () => menu.classList.toggle("hidden"));
      document.addEventListener("click", (e) => {
        if (!avatar.contains(e.target) && !menu.contains(e.target)) menu.classList.add("hidden");
      });
    }

    const logoutBtn = qs("#logoutBtn") || qs("#pm-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.clear();
        location.href = LOGIN;
      });
    }

    // Sidebar logout link (your manager.html has this)
    const sidebarLogout = qs("#sidebarLogout");
    if (sidebarLogout) {
      sidebarLogout.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        location.href = LOGIN;
      });
    }
  }

  // ---------------- NAVIGATION ----------------
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

        // load correct data
        if (page === "dashboard") await loadDashboard();
        if (page === "students") await loadStudents();
        if (page === "submitted-homework") await loadHomework();
        if (page === "users") await loadUsers();
        if (page === "submitted-courses") await loadCourses(); // safe
        if (page === "projects") await loadProjects(); // safe
      });
    });
  }

  function bindButtons() {
    // Refresh users button in HTML
    qs("#refreshUsersBtn")?.addEventListener("click", loadUsers);

    // ✅ Create user button (you added in Users page)
    qs("#createUserBtn")?.addEventListener("click", openCreateUserModal);

    // (Optional) if you later add these buttons:
    // qs("#createCourseBtn")?.addEventListener("click", openCreateCourseModal);
    // qs("#openCreateHw")?.addEventListener("click", openCreateHomeworkModal);
  }

  // ---------------- DASHBOARD ----------------
  async function loadDashboard() {
    const [courses, hw] = await Promise.all([fetchJSON("/courses"), fetchJSON("/homework")]);

    qs("#activeCoursesCount") && (qs("#activeCoursesCount").textContent = courses.length);
    qs("#toGradeCount") && (qs("#toGradeCount").textContent = hw.length);

    const coursesEl = qs("#courses");
    if (!coursesEl) return;

    coursesEl.innerHTML = courses
      .map(
        (c) => `
      <div class="bg-white p-4 rounded shadow flex justify-between items-center">
        <div>
          <div class="font-semibold">${esc(c.title)}</div>
          <div class="text-sm">${esc(c.description || "")}</div>
        </div>
        <button class="btn-del-course px-3 py-1 rounded bg-red-100 text-red-600" data-id="${c.id}">🗑</button>
      </div>
    `
      )
      .join("");

    qsa(".btn-del-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;
        await fetch(`${API}/courses/${id}`, { method: "DELETE" });
        await loadDashboard();
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
      <tr class="border-t">
        <td class="px-4 py-2">${esc(s.name)}</td>
        <td class="px-4 py-2">${esc(s.course || "")}</td>
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

  // ---------------- USERS ----------------
  async function loadUsers() {
    const table = qs("#usersTable");
    if (!table) {
      toast("Users table missing in HTML", "#b91c1c");
      return;
    }

    // IMPORTANT: server should return [{username,name,role}] for /api/users
    const users = await fetchJSON("/users");

    table.innerHTML = (users || [])
      .map(
        (u) => `
      <tr class="border-t">
        <td class="px-4 py-2">${esc(u.username)}</td>
        <td class="px-4 py-2">${esc(u.name || "")}</td>
        <td class="px-4 py-2">${esc(u.role)}</td>
        <td class="px-4 py-2 text-right">
          <button class="btn-del-user px-3 py-1 rounded bg-red-100 text-red-600" data-username="${esc(
            u.username
          )}">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");

    qsa(".btn-del-user").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.username;
        if (!confirm(`Delete ${username}?`)) return;

        const res = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-role": localStorage.getItem("role") || "",
          },
        });

        let out = null;
        try {
          out = await res.json();
        } catch {}

        if (!res.ok || out?.success === false) {
          toast(out?.message || "Delete failed", "#b91c1c");
          return;
        }

        toast("User deleted", "#b91c1c");
        await loadUsers();
        await loadStudents();
      });
    });
  }

  // ✅ MANAGER CREATE USER MODAL
  function openCreateUserModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create User</h2>

      <input id="newUsername" type="text" placeholder="Username"
        class="w-full border rounded-lg px-3 py-2 mb-3" />

      <div class="relative mb-3">
        <input id="newPassword" type="password" placeholder="Password"
          class="w-full border rounded-lg px-3 py-2 pr-12" />
        <button id="togglePw" type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm border rounded">
          👁
        </button>
      </div>

      <input id="newName" type="text" placeholder="Full name (optional)"
        class="w-full border rounded-lg px-3 py-2 mb-3" />

      <select id="newRole" class="w-full border rounded-lg px-3 py-2 mb-4">
        <option value="student">student</option>
        <option value="instructor">instructor</option>
        <option value="manager">manager</option>
      </select>

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitUser" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Create</button>
      </div>
    `);

    qs("#togglePw")?.addEventListener("click", () => {
      const pw = qs("#newPassword");
      pw.type = pw.type === "password" ? "text" : "password";
    });

    qs("#submitUser")?.addEventListener("click", async () => {
      const username = qs("#newUsername").value.trim();
      const password = qs("#newPassword").value.trim();
      const name = qs("#newName").value.trim();
      const role = qs("#newRole").value;

      if (!username || !password || !role) {
        toast("Username, password, role required", "#b91c1c");
        return;
      }

      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-role": localStorage.getItem("role") || "",
        },
        body: JSON.stringify({ username, password, role, name }),
      });

      let out = null;
      try {
        out = await res.json();
      } catch {}

      if (!res.ok || out?.success === false) {
        toast(out?.message || "Create failed", "#b91c1c");
        return;
      }

      closeModal();
      toast("User created", "#166534");
      await loadUsers();
      await loadStudents();
    });
  }

  // ---------------- MODAL SYSTEM ----------------
  function showModal(inner) {
    if (qs("#modalBg")) return;
    const bg = document.createElement("div");
    bg.id = "modalBg";
    bg.className = "fixed inset-0 bg-black/40 flex items-center justify-center z-50";
    bg.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-lg w-[90%] max-w-md">${inner}</div>`;
    document.body.appendChild(bg);

    bg.addEventListener("click", (e) => {
      if (e.target === bg) closeModal();
    });

    bg.querySelector("#cancelModal")?.addEventListener("click", closeModal);
  }

  function closeModal() {
    qs("#modalBg")?.remove();
  }

  // ---------------- SAFE PAGE LOADERS (prevent crashes) ----------------
  async function loadCourses() {
    // used by nav if you have a submitted-courses page
    const box = qs("#submitted-courses-list");
    if (!box) return;
    const courses = await fetchJSON("/courses");
    box.innerHTML = courses
      .map(
        (c) => `
      <div class="bg-white p-4 rounded shadow">
        <div class="font-semibold">${esc(c.title)}</div>
        <div class="text-sm">${esc(c.description || "")}</div>
      </div>
    `
      )
      .join("");
  }

  async function loadProjects() {
    // only if your server has /api/projects; if not, keep it quiet
    const box1 = qs("#dashboardProjects");
    const box2 = qs("#projectsFullList");
    if (!box1 && !box2) return;

    const projects = await fetchJSON("/projects"); // will return [] if endpoint missing

    if (box1) {
      box1.innerHTML = projects
        .map(
          (p) => `
        <div class="bg-white p-4 rounded shadow">
          <div class="font-semibold">${esc(p.title)}</div>
          <div class="text-sm">${esc(p.description || "")}</div>
        </div>
      `
        )
        .join("");
    }

    if (box2) {
      box2.innerHTML = projects
        .map(
          (p) => `
        <div class="bg-white p-4 rounded shadow">
          <div class="font-semibold">${esc(p.title)}</div>
          <div class="text-sm">${esc(p.description || "")}</div>
        </div>
      `
        )
        .join("");
    }
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
})();
