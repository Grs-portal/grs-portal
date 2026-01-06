// manager.js
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login.html";

  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];

  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className = "fixed bottom-4 right-4 px-4 py-2 rounded text-white shadow";
    t.style.background = color;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  const esc = s =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

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

    qs("#userName").textContent = localStorage.getItem("userName") || "Manager";
    qs("#y").textContent = new Date().getFullYear();

    setupNav();
    setupProfile();
    loadDashboard();
  }

  function setupProfile() {
    qs("#userAvatar").onclick = () => {
      const menu = qs("#profileMenu");
      menu.classList.toggle("hidden");
    };

    qs("#pm-logout").onclick = () => {
      localStorage.clear();
      location.href = LOGIN;
    };
  }

  function setupNav() {
    const pages = qsa(".page-section");

    qsa(".nav-item").forEach(btn => {
      btn.onclick = async e => {
        e.preventDefault();
        const page = btn.dataset.page;

        pages.forEach(p => p.classList.add("hidden"));
        qs(`#${page}`)?.classList.remove("hidden");

        qsa(".nav-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (page === "dashboard") loadDashboard();
        if (page === "students") loadStudents();
        if (page === "submitted-homework") loadHomework();
        if (page === "users") loadUsers();
      };
    });
  }

  // ---------------- DASHBOARD ----------------
  async function loadDashboard() {
    const [courses, hw] = await Promise.all([
      fetchJSON("/courses"),
      fetchJSON("/homework")
    ]);

    qs("#activeCoursesCount").textContent = courses.length;
    qs("#toGradeCount").textContent = hw.length;

    qs("#courses").innerHTML = courses.map(c => `
      <div class="bg-white p-4 rounded shadow flex justify-between">
        <div>
          <div class="font-semibold">${esc(c.title)}</div>
          <div class="text-sm">${esc(c.description)}</div>
        </div>
        <button onclick="deleteCourse(${c.id})">🗑</button>
      </div>
    `).join("");
  }

  window.deleteCourse = async id => {
    if (!confirm("Delete course?")) return;
    await fetch(`${API}/courses/${id}`, { method: "DELETE" });
    loadDashboard();
  };

  // ---------------- STUDENTS ----------------
  async function loadStudents() {
    const students = await fetchJSON("/students");

    qs("#studentTable").innerHTML = students.map(s => `
      <tr>
        <td class="px-4 py-2">${esc(s.name)}</td>
        <td class="px-4 py-2">${esc(s.course)}</td>
        <td class="px-4 py-2">${s.grade ?? "-"}</td>
      </tr>
    `).join("");
  }

  // ---------------- HOMEWORK ----------------
  async function loadHomework() {
    const hw = await fetchJSON("/homework");

    qs("#homework-list").innerHTML = hw.map(h => `
      <div class="bg-white p-4 rounded shadow">
        <div class="font-semibold">${esc(h.title)}</div>
        <div class="text-sm">${esc(h.course)}</div>
      </div>
    `).join("");
  }

  // ---------------- USERS (IMPORTANT) ----------------
  async function loadUsers() {
    const users = await fetchJSON("/users");
    const table = qs("#usersTable");

    if (!table) {
      toast("Users table missing in HTML", "#b91c1c");
      return;
    }

    table.innerHTML = users.map(u => `
      <tr>
        <td class="px-4 py-2">${esc(u.username)}</td>
        <td class="px-4 py-2">${esc(u.name)}</td>
        <td class="px-4 py-2">${esc(u.role)}</td>
        <td class="px-4 py-2 text-right">
          <button onclick="deleteUser('${esc(u.username)}')">Delete</button>
        </td>
      </tr>
    `).join("");
  }

  window.deleteUser = async username => {
    if (!confirm(`Delete ${username}?`)) return;

    const res = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      toast("Delete failed", "#b91c1c");
      return;
    }

    toast("User deleted", "#b91c1c");
    loadUsers();
  };

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
