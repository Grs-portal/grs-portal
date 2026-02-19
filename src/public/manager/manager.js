// manager.js 
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login.html";

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];

  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className =
      "fixed bottom-4 right-4 px-4 py-2 rounded-xl text-white shadow z-[9999] backdrop-blur-md border border-white/15";
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

  const actorHeaders = () => ({
    "x-role": localStorage.getItem("role") || "",
    "x-username": localStorage.getItem("username") || "",
    "x-name": localStorage.getItem("userName") || "",
  });

  const jsonHeaders = () => ({
    ...actorHeaders(),
    "Content-Type": "application/json",
  });

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (localStorage.getItem("isLoggedIn") !== "true") return (location.href = LOGIN);
    if (localStorage.getItem("role") !== "manager") return (location.href = LOGIN);

    const name = localStorage.getItem("userName") || "Manager";
    qs("#userName") && (qs("#userName").textContent = name);
    qs("#y") && (qs("#y").textContent = new Date().getFullYear());
    qs("#userAvatar") &&
      (qs("#userAvatar").textContent = name
        .split(" ")
        .map((x) => x[0])
        .join("")
        .toUpperCase()
        .slice(0, 2));

    setupProfile();
    setupMobileSidebar();
    setupNav();
    bindButtons();

    setupNotificationsUI();
    loadNotifications();
    setInterval(loadNotifications, 15000);

    await loadDashboard();
  }

  function logout() {
    localStorage.clear();
    location.href = LOGIN;
  }

  function setupProfile() {
    qs("#userAvatar")?.addEventListener("click", (e) => {
      e.stopPropagation();
      qs("#profileMenu")?.classList.toggle("hidden");
    });

    qs("#logoutBtn")?.addEventListener("click", logout);
    qs("#sidebarLogout")?.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });

    document.addEventListener("click", (e) => {
      const wrap = qs("#topAvatarWrap");
      if (wrap && !wrap.contains(e.target)) qs("#profileMenu")?.classList.add("hidden");
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        qs("#profileMenu")?.classList.add("hidden");
        qs("#notifMenu")?.classList.add("hidden");
        qs("#modalBg")?.remove();
      }
    });
  }

  function setupMobileSidebar() {
    const menuBtn = qs("#menuBtn");
    const sidebar = qs("#sidebar");
    const overlay = qs("#overlay");
    if (!menuBtn || !sidebar || !overlay) return;

    const close = () => {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
      document.body.style.overflow = "";
    };

    const toggle = () => {
      const closed = sidebar.classList.contains("-translate-x-full");
      if (closed) {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else close();
    };

    menuBtn.addEventListener("click", toggle);
    overlay.addEventListener("click", close);
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
        if (page === "students") await loadStudents();
        if (page === "submitted-homework") await loadHomework();
        if (page === "submitted-courses") await loadCourses();
        if (page === "users") await loadUsers();

        qs("#sidebar")?.classList.add("-translate-x-full");
        qs("#overlay")?.classList.add("hidden");
        document.body.style.overflow = "";
      });
    });
  }

  function bindButtons() {
    qs("#openCreateHw")?.addEventListener("click", openCreateHomeworkModal);
    qs("#openCreateCourse")?.addEventListener("click", openCreateCourseModal);
    qs("#refreshUsersBtn")?.addEventListener("click", loadUsers);
    qs("#createUserBtn")?.addEventListener("click", openCreateUserModal);
  }

  // ---------------- MODAL (GLASS) ----------------
  function showModal(html) {
    closeModal();

    const bg = document.createElement("div");
    bg.id = "modalBg";
    bg.className =
      "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4";

    bg.innerHTML = `
      <div class="w-full max-w-md rounded-[22px] p-6
        bg-white/10 border border-white/20 shadow-2xl backdrop-blur-xl">
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

  async function confirmDeleteUser(username) {
    const typed = prompt(`Type the username "${username}" to confirm delete:`);
    return typed === username;
  }

  // ---------------- NOTIFICATIONS ----------------
  function setupNotificationsUI() {
    const btn = qs("#notifBtn");
    const menu = qs("#notifMenu");
    const wrap = qs("#notifWrap");
    const readAll = qs("#notifReadAll");

    btn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      menu?.classList.toggle("hidden");
      if (menu && !menu.classList.contains("hidden")) await loadNotifications();
    });

    document.addEventListener("click", (e) => {
      if (!wrap || !menu) return;
      if (!wrap.contains(e.target)) menu.classList.add("hidden");
    });

    readAll?.addEventListener("click", async (e) => {
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
    if (!username || !["manager", "instructor"].includes(role)) return;

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

    list.innerHTML = items
      .map(
        (n) => `
      <div class="px-4 py-3 border-b border-white/10 ${n.unread ? "bg-white/10" : "bg-transparent"}">
        <div class="text-sm font-semibold text-white/95">${esc(n.message || "")}</div>
        <div class="text-xs text-white/60 mt-1">
          ${esc(n.byName || n.byUsername || "Someone")} · ${esc(n.byRole || "")} ·
          ${new Date(n.ts).toLocaleString()}
        </div>
      </div>
    `
      )
      .join("");
  }

  // ---------------- DASHBOARD ----------------
  async function loadDashboard() {
    const [courses, hw] = await Promise.all([fetchJSON("/courses"), fetchJSON("/homework")]);

    qs("#activeCoursesCount") && (qs("#activeCoursesCount").textContent = courses.length);
    qs("#toGradeCount") && (qs("#toGradeCount").textContent = hw.length);

    const box = qs("#courses");
    if (!box) return;

    box.innerHTML = courses
      .map(
        (c) => `
      <div class="p-4 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-lg
                  flex justify-between items-start">
        <div>
          <div class="font-semibold text-white/95">${esc(c.title)}</div>
          <div class="text-sm text-white/70 mt-1">${esc(c.description || "")}</div>
          <div class="text-xs text-white/60 mt-2">Type: ${esc(c.locationType || "in-person")}</div>
          ${
            c.pdfUrl
              ? `<a class="text-xs underline text-emerald-200 hover:text-emerald-100" href="${esc(
                  c.pdfUrl
                )}" target="_blank">PDF: ${esc(c.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="edit-course px-2 py-1 rounded-lg hover:bg-white/10" data-id="${c.id}" title="Edit">✏️</button>
          <button class="del-course px-2 py-1 rounded-lg hover:bg-white/10 text-red-200" data-id="${c.id}" title="Delete">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    box.querySelectorAll(".del-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;
        const r = await fetch(`${API}/courses/${id}`, {
          method: "DELETE",
          headers: actorHeaders(),
        });
        if (!r.ok) return toast("Delete failed", "#b91c1c");
        toast("Deleted", "#b91c1c");
        loadDashboard();
        loadNotifications();
      });
    });

    box.querySelectorAll(".edit-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const coursesNow = await fetchJSON("/courses");
        const found = coursesNow.find((x) => String(x.id) === String(id));
        if (found) openEditCourseModal(found);
      });
    });
  }

  // ---------------- COURSES PAGE ----------------
  async function loadCourses() {
    const courses = await fetchJSON("/courses");
    const list = qs("#submitted-courses-list");
    if (!list) return;

    list.innerHTML = courses
      .map(
        (c) => `
      <div class="p-4 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-lg
                  mb-3 flex justify-between items-start">
        <div>
          <div class="font-semibold text-white/95">${esc(c.title)}</div>
          <div class="text-sm text-white/70 mt-1">${esc(c.description || "")}</div>
          <div class="text-xs text-white/60 mt-2">Type: ${esc(c.locationType || "in-person")}</div>
          ${
            c.pdfUrl
              ? `<a class="text-xs underline text-emerald-200 hover:text-emerald-100" href="${esc(
                  c.pdfUrl
                )}" target="_blank">PDF: ${esc(c.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="edit-course px-2 py-1 rounded-lg hover:bg-white/10" data-id="${c.id}" title="Edit">✏️</button>
          <button class="del-course px-2 py-1 rounded-lg hover:bg-white/10 text-red-200" data-id="${c.id}" title="Delete">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    list.querySelectorAll(".del-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;
        const r = await fetch(`${API}/courses/${id}`, {
          method: "DELETE",
          headers: actorHeaders(),
        });
        if (!r.ok) return toast("Delete failed", "#b91c1c");
        toast("Deleted", "#b91c1c");
        loadCourses();
        loadDashboard();
        loadNotifications();
      });
    });

    list.querySelectorAll(".edit-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const found = courses.find((x) => String(x.id) === String(id));
        if (found) openEditCourseModal(found);
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
      <tr class="border-t border-white/10">
        <td class="px-6 py-3 text-white/90">${esc(s.name)}</td>
        <td class="px-6 py-3 text-white/70">${esc(s.course)}</td>
        <td class="px-6 py-3 text-white/90">${s.grade ?? "-"}</td>
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
      .map(
        (h) => `
      <div class="p-4 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-lg
                  flex justify-between items-start">
        <div>
          <div class="font-semibold text-white/95">${esc(h.title)}</div>
          <div class="text-sm text-white/70 mt-1">${esc(h.description || "")}</div>
          <div class="text-xs text-white/60 mt-2">By: ${esc(h.submitted_by || "N/A")} · ${esc(
          h.course || ""
        )}</div>
          ${
            h.pdfUrl
              ? `<a class="text-xs underline text-emerald-200 hover:text-emerald-100" href="${esc(
                  h.pdfUrl
                )}" target="_blank">PDF: ${esc(h.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="edit-hw px-2 py-1 rounded-lg hover:bg-white/10" data-id="${h.id}" title="Edit">✏️</button>
          <button class="del-hw px-2 py-1 rounded-lg hover:bg-white/10 text-red-200" data-id="${h.id}" title="Delete">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    list.querySelectorAll(".del-hw").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete homework?")) return;
        const r = await fetch(`${API}/homework/${id}`, {
          method: "DELETE",
          headers: actorHeaders(),
        });
        if (!r.ok) return toast("Delete failed", "#b91c1c");
        toast("Deleted", "#b91c1c");
        loadHomework();
        loadDashboard();
        loadNotifications();
      });
    });

    list.querySelectorAll(".edit-hw").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const found = hw.find((x) => String(x.id) === String(id));
        if (found) openEditHomeworkModal(found);
      });
    });
  }

  // ---------------- UPLOAD HELPER ----------------
  async function uploadPdf(file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
    const out = await safeJson(res);
    if (!res.ok || !out?.success) throw new Error(out?.message || "Upload failed");
    return out; // {url, originalName}
  }

  // ---------------- CREATE/EDIT MODALS (GLASS) ----------------
  function inputClass() {
    return "w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-emerald-200/40";
  }

  function btnDark() {
    return "px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold border border-white/15";
  }

  function btnPrimary() {
    return "px-4 py-2 rounded-xl bg-emerald-300/80 hover:bg-emerald-300 text-emerald-950 font-bold";
  }

  function openCreateCourseModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4 text-white">Create Course</h2>
      <input id="courseTitle" class="${inputClass()}" placeholder="Title" />
      <textarea id="courseDesc" class="${inputClass()} mt-3" placeholder="Description"></textarea>

      <select id="courseType" class="${inputClass()} mt-3">
        <option value="in-person">In-person</option>
        <option value="online">Online</option>
        <option value="hybrid">Hybrid</option>
      </select>

      <div class="mt-3 text-xs text-white/60">Optional PDF</div>
      <input id="coursePdf" type="file" accept=".pdf" class="w-full mt-2 text-white/80" />

      <div class="flex justify-end gap-2 mt-5">
        <button id="cancelModal" class="${btnDark()}">Cancel</button>
        <button id="submitCourse" class="${btnPrimary()}">Create</button>
      </div>
    `);

    qs("#submitCourse")?.addEventListener("click", async () => {
      const title = qs("#courseTitle").value.trim();
      const description = qs("#courseDesc").value.trim();
      const locationType = qs("#courseType").value;
      if (!title) return toast("Title required", "#b91c1c");

      let pdfUrl = "", pdfName = "";
      const file = qs("#coursePdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url;
          pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "#b91c1c");
      }

      const res = await fetch(`${API}/courses`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, locationType, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Create course failed", "#b91c1c");
      closeModal();
      toast("Course created", "#166534");
      loadCourses();
      loadDashboard();
      loadNotifications();
    });
  }

  function openEditCourseModal(course) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4 text-white">Edit Course</h2>
      <input id="courseTitle" class="${inputClass()}" value="${esc(course.title)}" />
      <textarea id="courseDesc" class="${inputClass()} mt-3">${esc(course.description || "")}</textarea>

      <select id="courseType" class="${inputClass()} mt-3">
        <option value="in-person" ${course.locationType === "in-person" ? "selected" : ""}>In-person</option>
        <option value="online" ${course.locationType === "online" ? "selected" : ""}>Online</option>
        <option value="hybrid" ${course.locationType === "hybrid" ? "selected" : ""}>Hybrid</option>
      </select>

      <div class="text-xs text-white/60 mt-3">
        ${course.pdfUrl ? `Current PDF: ${esc(course.pdfName || "Attached")}` : "No PDF attached"}
      </div>
      <input id="coursePdf" type="file" accept=".pdf" class="w-full mt-2 text-white/80" />

      <div class="flex justify-end gap-2 mt-5">
        <button id="cancelModal" class="${btnDark()}">Cancel</button>
        <button id="saveCourse" class="${btnPrimary()}">Save</button>
      </div>
    `);

    qs("#saveCourse")?.addEventListener("click", async () => {
      const title = qs("#courseTitle").value.trim();
      const description = qs("#courseDesc").value.trim();
      const locationType = qs("#courseType").value;
      if (!title) return toast("Title required", "#b91c1c");

      let pdfUrl = course.pdfUrl || "", pdfName = course.pdfName || "";
      const file = qs("#coursePdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url;
          pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "#b91c1c");
      }

      const res = await fetch(`${API}/courses/${encodeURIComponent(course.id)}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, locationType, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Update failed", "#b91c1c");
      closeModal();
      toast("Course updated", "#166534");
      loadCourses();
      loadDashboard();
      loadNotifications();
    });
  }

  function openCreateHomeworkModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4 text-white">Create Homework</h2>
      <input id="hwTitle" class="${inputClass()}" placeholder="Title" />
      <textarea id="hwDesc" class="${inputClass()} mt-3" placeholder="Description"></textarea>
      <input id="hwCourse" class="${inputClass()} mt-3" placeholder="Course name" />

      <div class="mt-3 text-xs text-white/60">Optional PDF</div>
      <input id="hwPdf" type="file" accept=".pdf" class="w-full mt-2 text-white/80" />

      <div class="flex justify-end gap-2 mt-5">
        <button id="cancelModal" class="${btnDark()}">Cancel</button>
        <button id="submitHw" class="${btnPrimary()}">Create</button>
      </div>
    `);

    qs("#submitHw")?.addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      if (!title || !course) return toast("Title + course required", "#b91c1c");

      let pdfUrl = "", pdfName = "";
      const file = qs("#hwPdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url;
          pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "#b91c1c");
      }

      const res = await fetch(`${API}/homework`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, course, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Create homework failed", "#b91c1c");
      closeModal();
      toast("Homework created", "#166534");
      loadHomework();
      loadDashboard();
      loadNotifications();
    });
  }

  function openEditHomeworkModal(hw) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4 text-white">Edit Homework</h2>
      <input id="hwTitle" class="${inputClass()}" value="${esc(hw.title)}" />
      <textarea id="hwDesc" class="${inputClass()} mt-3">${esc(hw.description || "")}</textarea>
      <input id="hwCourse" class="${inputClass()} mt-3" value="${esc(hw.course || "")}" />

      <div class="text-xs text-white/60 mt-3">
        ${hw.pdfUrl ? `Current PDF: ${esc(hw.pdfName || "Attached")}` : "No PDF attached"}
      </div>
      <input id="hwPdf" type="file" accept=".pdf" class="w-full mt-2 text-white/80" />

      <div class="flex justify-end gap-2 mt-5">
        <button id="cancelModal" class="${btnDark()}">Cancel</button>
        <button id="saveHw" class="${btnPrimary()}">Save</button>
      </div>
    `);

    qs("#saveHw")?.addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      if (!title || !course) return toast("Title + course required", "#b91c1c");

      let pdfUrl = hw.pdfUrl || "", pdfName = hw.pdfName || "";
      const file = qs("#hwPdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url;
          pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "#b91c1c");
      }

      const res = await fetch(`${API}/homework/${encodeURIComponent(hw.id)}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, course, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Update failed", "#b91c1c");
      closeModal();
      toast("Homework updated", "#166534");
      loadHomework();
      loadDashboard();
      loadNotifications();
    });
  }

  function openCreateUserModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4 text-white">Create User</h2>
      <input id="uUsername" class="${inputClass()}" placeholder="Username" />
      <input id="uName" class="${inputClass()} mt-3" placeholder="Full name" />
      <input id="uPassword" type="password" class="${inputClass()} mt-3" placeholder="Password" />

      <select id="uRole" class="${inputClass()} mt-3">
        <option value="student">student</option>
        <option value="instructor">instructor</option>
        <option value="manager">manager</option>
      </select>

      <div class="flex justify-end gap-2 mt-5">
        <button id="cancelModal" class="${btnDark()}">Cancel</button>
        <button id="submitUser" class="${btnPrimary()}">Create</button>
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
        headers: jsonHeaders(),
        body: JSON.stringify({ username, password, role, name }),
      });

      const out = await safeJson(res);
      if (!res.ok || !out?.success) return toast(out?.message || "Create failed", "#b91c1c");

      closeModal();
      toast("User created", "#166534");
      loadUsers();
      loadNotifications();
    });
  }

  // ---------------- USERS ----------------
  async function loadUsers() {
    const table = qs("#usersTable");
    if (!table) return toast("Missing #usersTable", "#b91c1c");

    const res = await fetch(`${API}/users`, { headers: actorHeaders() });

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
      <tr class="border-t border-white/10">
        <td class="px-6 py-3 text-white/90">${esc(u.username)}</td>
        <td class="px-6 py-3 text-white/70">${esc(u.name || "")}</td>
        <td class="px-6 py-3 text-white/70">${esc(u.role || "")}</td>
        <td class="px-6 py-3 text-right">
          <button class="del-user px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-red-200 border border-white/15"
            data-username="${esc(u.username)}">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");

    table.querySelectorAll(".del-user").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.username;
        if (!(await confirmDeleteUser(username))) return;

        const del = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
          method: "DELETE",
          headers: actorHeaders(),
        });

        const out = await safeJson(del);
        if (!del.ok || !out?.success) return toast(out?.message || "Delete failed", "#b91c1c");

        toast("User deleted", "#b91c1c");
        loadUsers();
        loadNotifications();
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
