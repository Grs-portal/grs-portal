// manager.js
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login.html";

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));

  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className = "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg z-[9999]";
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
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const managerHeadersJson = () => ({
    "x-role": localStorage.getItem("role") || "",
    "Content-Type": "application/json",
  });

  function managerHeaderRoleOnly() {
    return { "x-role": localStorage.getItem("role") || "" };
  }

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (!localStorage.getItem("isLoggedIn")) return (location.href = LOGIN);
    if (localStorage.getItem("role") !== "manager") return (location.href = LOGIN);

    const name = localStorage.getItem("userName") || "Manager";
    qs("#userName").textContent = name;
    qs("#y").textContent = new Date().getFullYear();
    qs("#userAvatar").textContent = name
      .split(" ")
      .map((x) => x[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    setupProfile();
    setupMobileSidebar();
    setupNav();
    bindButtons();

    await loadDashboard();
  }

  function logout() {
    localStorage.clear();
    location.href = LOGIN;
  }

  function setupProfile() {
    qs("#userAvatar")?.addEventListener("click", () => qs("#profileMenu")?.classList.toggle("hidden"));
    qs("#logoutBtn")?.addEventListener("click", logout);
    qs("#sidebarLogout")?.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });

    document.addEventListener("click", (e) => {
      const wrap = qs("#topAvatarWrap");
      if (wrap && !wrap.contains(e.target)) qs("#profileMenu")?.classList.add("hidden");
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
    const links = qsa(".nav-item");

    links.forEach((link) => {
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (!page) return;

        pages.forEach((p) => p.classList.add("hidden"));
        qs(`#${page}`)?.classList.remove("hidden");

        links.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        if (page === "dashboard") await loadDashboard();
        if (page === "projects") await renderProjectsFull?.();
        if (page === "students") await loadStudents();
        if (page === "submitted-homework") await loadHomework();
        if (page === "submitted-courses") await loadCourses();
        if (page === "users") await loadUsers();
      });
    });
  }

  function bindButtons() {
    // ✅ your HTML uses these IDs:
    qs("#createCourseBtn")?.addEventListener("click", () => openCourseModal());
    qs("#openCreateHw")?.addEventListener("click", () => openHomeworkModal());
    qs("#createProjectBtn")?.addEventListener("click", () => openCreateProjectModal?.()); // if you have it

    qs("#refreshUsersBtn")?.addEventListener("click", loadUsers);

    // If you add a create user button in HTML with id="createUserBtn"
    qs("#createUserBtn")?.addEventListener("click", openCreateUserModal);
  }

  // ---------------- MODAL ----------------
  function showModal(html) {
    closeModal();
    const bg = document.createElement("div");
    bg.id = "modalBg";
    bg.className = "fixed inset-0 bg-black/40 flex items-center justify-center z-50";
    bg.innerHTML = `
      <div class="bg-white rounded-2xl p-6 shadow-lg w-[92%] max-w-md">
        ${html}
      </div>
    `;
    document.body.appendChild(bg);

    bg.addEventListener("click", (e) => {
      if (e.target === bg) closeModal();
    });
    bg.querySelector("#cancelModal")?.addEventListener("click", closeModal);
  }

  function closeModal() {
    qs("#modalBg")?.remove();
  }

  // ---------------- DASHBOARD ----------------
  async function loadDashboard() {
    const [courses, hw] = await Promise.all([fetchJSON("/courses"), fetchJSON("/homework")]);

    qs("#activeCoursesCount").textContent = courses.length;
    qs("#toGradeCount").textContent = hw.length;

    // render courses on dashboard
    const box = qs("#courses");
    if (!box) return;

    box.innerHTML = courses
      .map((c) => {
        const attach =
          c.attachment?.url
            ? `<a class="text-xs underline opacity-80 hover:opacity-100" href="${c.attachment.url}" target="_blank">View file</a>`
            : `<span class="text-xs opacity-60">No file</span>`;

        const loc =
          c.location_type
            ? `<div class="text-xs opacity-70 mt-1">${esc(c.location_type)}${c.location_detail ? " · " + esc(c.location_detail) : ""}</div>`
            : "";

        return `
      <div class="bg-white p-4 rounded-xl shadow border flex justify-between items-start gap-3">
        <div class="min-w-0">
          <div class="font-semibold truncate">${esc(c.title)}</div>
          <div class="text-sm opacity-80">${esc(c.description || "")}</div>
          ${loc}
          <div class="mt-2 flex items-center gap-3">
            <span class="text-xs opacity-70">By ${esc(c.created_by || "N/A")}</span>
            ${attach}
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="edit-course px-2 py-1 rounded hover:bg-black/5" data-id="${c.id}">✏️</button>
          <button class="del-course text-red-600 px-2 py-1 rounded hover:bg-red-50" data-id="${c.id}">🗑</button>
        </div>
      </div>
    `;
      })
      .join("");

    box.querySelectorAll(".del-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;

        const res = await fetch(`${API}/courses/${id}`, { method: "DELETE" });
        if (!res.ok) return toast("Delete failed", "#b91c1c");

        toast("Course deleted", "#b91c1c");
        loadDashboard();
      });
    });

    box.querySelectorAll(".edit-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const all = await fetchJSON("/courses");
        const course = all.find((x) => String(x.id) === String(id));
        if (!course) return toast("Course not found", "#b91c1c");
        openCourseModal(course);
      });
    });
  }

  // ---------------- COURSES LIST PAGE ----------------
  async function loadCourses() {
    const courses = await fetchJSON("/courses");
    const list = qs("#submitted-courses-list");
    if (!list) return;

    list.innerHTML = courses
      .map((c) => {
        const attach =
          c.attachment?.url
            ? `<a class="text-xs underline opacity-80 hover:opacity-100" href="${c.attachment.url}" target="_blank">View file</a>`
            : `<span class="text-xs opacity-60">No file</span>`;

        const loc =
          c.location_type
            ? `<div class="text-xs opacity-70 mt-1">${esc(c.location_type)}${c.location_detail ? " · " + esc(c.location_detail) : ""}</div>`
            : "";

        return `
      <div class="bg-white p-4 rounded-xl shadow border mb-3 flex justify-between items-start gap-3">
        <div class="min-w-0">
          <div class="font-semibold truncate">${esc(c.title)}</div>
          <div class="text-sm opacity-80">${esc(c.description || "")}</div>
          ${loc}
          <div class="mt-2 flex items-center gap-3">
            <span class="text-xs opacity-70">By ${esc(c.created_by || "N/A")}</span>
            ${attach}
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="edit-course px-2 py-1 rounded hover:bg-black/5" data-id="${c.id}">✏️</button>
          <button class="del-course text-red-600 px-2 py-1 rounded hover:bg-red-50" data-id="${c.id}">🗑</button>
        </div>
      </div>
    `;
      })
      .join("");

    list.querySelectorAll(".del-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;
        const res = await fetch(`${API}/courses/${id}`, { method: "DELETE" });
        if (!res.ok) return toast("Delete failed", "#b91c1c");
        toast("Course deleted", "#b91c1c");
        loadCourses();
        loadDashboard();
      });
    });

    list.querySelectorAll(".edit-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const all = await fetchJSON("/courses");
        const course = all.find((x) => String(x.id) === String(id));
        if (!course) return toast("Course not found", "#b91c1c");
        openCourseModal(course);
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
        <td class="px-6 py-3">${esc(s.name)}</td>
        <td class="px-6 py-3">${esc(s.course)}</td>
        <td class="px-6 py-3">${s.grade ?? "-"}</td>
        <td class="px-6 py-3 text-right"></td>
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
      .map((h) => {
        const attach =
          h.attachment?.url
            ? `<a class="text-xs underline opacity-80 hover:opacity-100" href="${h.attachment.url}" target="_blank">View file</a>`
            : `<span class="text-xs opacity-60">No file</span>`;

        const courseLabel = h.course_title || h.course || "";

        return `
      <div class="bg-white p-4 rounded-xl shadow border relative">
        <div class="font-semibold">${esc(h.title)}</div>
        <div class="text-sm opacity-80">${esc(h.description || "")}</div>
        <div class="mt-2 flex items-center gap-3">
          <span class="text-xs opacity-70">By ${esc(h.submitted_by || "N/A")} · ${esc(courseLabel)}</span>
          ${attach}
        </div>

        <div class="absolute top-3 right-3 flex gap-2">
          <button class="edit-hw px-2 py-1 rounded hover:bg-black/5" data-id="${h.id}">✏️</button>
          <button class="del-hw text-rose-600 px-2 py-1 rounded hover:bg-rose-50" data-id="${h.id}">🗑</button>
        </div>
      </div>
    `;
      })
      .join("");

    list.querySelectorAll(".del-hw").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete this homework?")) return;

        const res = await fetch(`${API}/homework/${id}`, { method: "DELETE" });
        if (!res.ok) return toast("Delete failed", "#b91c1c");

        toast("Homework deleted", "#b91c1c");
        loadHomework();
        loadDashboard();
      });
    });

    list.querySelectorAll(".edit-hw").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const all = await fetchJSON("/homework");
        const item = all.find((x) => String(x.id) === String(id));
        if (!item) return toast("Homework not found", "#b91c1c");
        openHomeworkModal(item);
      });
    });
  }

  // ---------------- USERS ----------------
  async function loadUsers() {
    const table = qs("#usersTable");
    if (!table) return toast("Missing #usersTable", "#b91c1c");

    const res = await fetch(`${API}/users`, { headers: managerHeaderRoleOnly() });

    if (res.status === 403) {
      table.innerHTML = "";
      return toast("Forbidden: missing manager role", "#b91c1c");
    }

    const users = await safeJson(res);
    if (!Array.isArray(users)) {
      table.innerHTML = "";
      return toast("Failed to load users", "#b91c1c");
    }

    table.innerHTML = users
      .map(
        (u) => `
      <tr class="border-t">
        <td class="px-6 py-3">${esc(u.username)}</td>
        <td class="px-6 py-3">${esc(u.name || "")}</td>
        <td class="px-6 py-3">${esc(u.role || "")}</td>
        <td class="px-6 py-3 text-right">
          <button class="del-user px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
            data-username="${esc(u.username)}">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");

    table.querySelectorAll(".del-user").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.username;
        if (!username) return;

        // ✅ strong confirmation: type YES
        const typed = prompt(`Type YES to delete "${username}"`);
        if (typed !== "YES") return toast("Cancelled", "#b91c1c");

        const del = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
          method: "DELETE",
          headers: managerHeaderRoleOnly(),
        });

        const out = await safeJson(del);
        if (!del.ok || !out?.success) return toast(out?.message || "Delete failed", "#b91c1c");

        toast("User deleted", "#b91c1c");
        loadUsers();
      });
    });
  }

  // ---------------- CREATE / EDIT COURSE (FormData + file + location + created_by) ----------------
  function openCourseModal(existing = null) {
    const isEdit = !!existing;
    const creator = localStorage.getItem("userName") || "Manager";

    showModal(`
      <h2 class="text-xl font-semibold mb-4">${isEdit ? "Edit Course" : "Create Course"}</h2>

      <input id="courseTitle" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Title"
        value="${isEdit ? esc(existing.title) : ""}" />

      <textarea id="courseDesc" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Description">${isEdit ? esc(existing.description || "") : ""}</textarea>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <select id="courseType" class="w-full border rounded-lg px-3 py-2">
          <option value="in-person">In-person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <input id="courseWhere" class="w-full border rounded-lg px-3 py-2" placeholder="Room / Link"
          value="${isEdit ? esc(existing.location_detail || "") : ""}" />
      </div>

      <label class="block text-sm font-semibold mb-1">Attachment (optional)</label>
      <input id="courseFile" type="file" class="w-full border rounded-lg px-3 py-2 mb-4" />

      ${
        isEdit && existing.attachment?.url
          ? `<div class="text-sm mb-4">Current file:
              <a class="underline" href="${existing.attachment.url}" target="_blank">${esc(existing.attachment.originalName || "View")}</a>
            </div>`
          : ""
      }

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitCourse" class="px-4 py-2 bg-black text-white rounded-lg">${isEdit ? "Save" : "Create"}</button>
      </div>
    `);

    // set selected on edit
    if (isEdit && existing.location_type) {
      const typeEl = qs("#courseType");
      if (typeEl) typeEl.value = existing.location_type;
    }

    qs("#submitCourse")?.addEventListener("click", async () => {
      const title = qs("#courseTitle").value.trim();
      const description = qs("#courseDesc").value.trim();
      const location_type = qs("#courseType").value;
      const location_detail = qs("#courseWhere").value.trim();
      const file = qs("#courseFile").files?.[0];

      if (!title) return toast("Title required", "#b91c1c");

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("location_type", location_type);
      fd.append("location_detail", location_detail);

      if (isEdit) fd.append("updated_by", creator);
      else fd.append("created_by", creator);

      if (file) fd.append("file", file);

      const url = isEdit ? `${API}/courses/${existing.id}` : `${API}/courses`;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: fd });

      if (!res.ok) return toast(isEdit ? "Save failed" : "Create failed", "#b91c1c");

      closeModal();
      toast(isEdit ? "Course updated" : "Course created", "#166534");
      loadDashboard();
      loadCourses();
    });
  }

  // ---------------- CREATE / EDIT HOMEWORK (FormData + file + submitted_by) ----------------
  function openHomeworkModal(existing = null) {
    const isEdit = !!existing;
    const creator = localStorage.getItem("userName") || "Manager";

    showModal(`
      <h2 class="text-xl font-semibold mb-4">${isEdit ? "Edit Homework" : "Create Homework"}</h2>

      <input id="hwTitle" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Title"
        value="${isEdit ? esc(existing.title) : ""}" />

      <textarea id="hwDesc" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Description">${isEdit ? esc(existing.description || "") : ""}</textarea>

      <input id="hwCourseId" type="number" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Course ID"
        value="${isEdit ? esc(existing.course_id ?? "") : ""}" />

      <label class="block text-sm font-semibold mb-1">Attachment (optional)</label>
      <input id="hwFile" type="file" class="w-full border rounded-lg px-3 py-2 mb-4" />

      ${
        isEdit && existing.attachment?.url
          ? `<div class="text-sm mb-4">Current file:
              <a class="underline" href="${existing.attachment.url}" target="_blank">${esc(existing.attachment.originalName || "View")}</a>
            </div>`
          : ""
      }

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitHw" class="px-4 py-2 bg-black text-white rounded-lg">${isEdit ? "Save" : "Create"}</button>
      </div>
    `);

    qs("#submitHw")?.addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course_id = qs("#hwCourseId").value;
      const file = qs("#hwFile").files?.[0];

      if (!title || !course_id) return toast("Title + Course ID required", "#b91c1c");

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("course_id", course_id);

      if (isEdit) fd.append("updated_by", creator);
      else fd.append("submitted_by", creator);

      if (file) fd.append("file", file);

      const url = isEdit ? `${API}/homework/${existing.id}` : `${API}/homework`;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: fd });

      if (!res.ok) return toast(isEdit ? "Save failed" : "Create failed", "#b91c1c");

      closeModal();
      toast(isEdit ? "Homework updated" : "Homework created", "#166534");
      loadHomework();
      loadDashboard();
    });
  }

  // ---------------- CREATE USER ----------------
  function openCreateUserModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create User</h2>

      <input id="uUsername" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Username" />
      <input id="uName" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Full name" />
      <input id="uPassword" type="password" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Password" />

      <select id="uRole" class="w-full border rounded-lg px-3 py-2 mb-4">
        <option value="student">student</option>
        <option value="instructor">instructor</option>
        <option value="manager">manager</option>
      </select>

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitUser" class="px-4 py-2 bg-black text-white rounded-lg">Create</button>
      </div>
    `);

    qs("#submitUser")?.addEventListener("click", async () => {
      const username = qs("#uUsername").value.trim();
      const name = qs("#uName").value.trim() || username;
      const password = qs("#uPassword").value.trim();
      const role = qs("#uRole").value;

      if (!username || !password) return toast("Username + password required", "#b91c1c");

      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: managerHeadersJson(),
        body: JSON.stringify({ username, password, role, name }),
      });

      const out = await safeJson(res);
      if (!res.ok || !out?.success) return toast(out?.message || "Create failed", "#b91c1c");

      closeModal();
      toast("User created", "#166534");
      loadUsers();
    });
  }

  // ---------------- UTIL ----------------
  async function fetchJSON(path) {
    try {
      const r = await fetch(API + path, { headers: managerHeaderRoleOnly() });
      if (!r.ok) return [];
      const data = await safeJson(r);
      return Array.isArray(data) ? data : [];
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
