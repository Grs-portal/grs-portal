document.addEventListener("DOMContentLoaded", () => {
  const LOGIN_URL = "/homepage/login.html";
  const API_BASE = ""; // same origin

  // protect portals only
  const PROTECTED_PREFIXES = ["/instructor", "/manager", "/students"];
  const path = window.location.pathname;

  const isLoginPage =
    path === "/homepage/login.html" ||
    path.endsWith("/homepage/login.html") ||
    path.endsWith("/login.html");

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !localStorage.getItem("isLoggedIn")) {
    if (!isLoginPage) window.location.replace(LOGIN_URL);
    return;
  }

  // ===== Elements
  const yearSpan = document.getElementById("y");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const overlay = document.getElementById("overlay");
  const menuLinks = document.querySelectorAll("nav a[data-page]");
  const pages = document.querySelectorAll(".page-section");

  // ===== Sidebar (mobile)
  menuBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("-translate-x-full");
    overlay?.classList.toggle("hidden");
  });

  overlay?.addEventListener("click", () => {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  });

  // ===== Toast
  function showToast(message, color = "#1C1820") {
    const toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg z-[9999]";
    toast.style.backgroundColor = color;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ===== Modal
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

  function closeModal() {
    document.getElementById("modalBg")?.remove();
  }

  // ===== Escape
  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // ===== Profile + Logout
  const userName = document.getElementById("userName");
  const userAvatar = document.getElementById("userAvatar");
  const profileMenu = document.getElementById("profileMenu");
  const logoutBtn = document.getElementById("logoutBtn");
  const sidebarLogout = document.getElementById("sidebarLogout");

  const displayName = localStorage.getItem("userName") || "Instructor";
  if (userName) userName.textContent = displayName;

  if (userAvatar) {
    userAvatar.textContent = displayName
      .split(" ")
      .map((x) => x[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  userAvatar?.addEventListener("click", () => profileMenu?.classList.toggle("hidden"));
  logoutBtn?.addEventListener("click", logout);
  sidebarLogout?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  document.addEventListener("click", (e) => {
    const wrap = document.getElementById("topAvatarWrap");
    if (wrap && profileMenu && !wrap.contains(e.target)) profileMenu.classList.add("hidden");
  });

  function logout() {
    localStorage.clear();
    window.location.replace(LOGIN_URL);
  }

  // ===== Navigation
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pageId = link.dataset.page;
      if (!pageId) return;

      showPage(pageId);

      menuLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      sidebar?.classList.add("-translate-x-full");
      overlay?.classList.add("hidden");
    });
  });

  function showPage(id) {
    pages.forEach((p) => p.classList.add("hidden"));
    document.getElementById(id)?.classList.remove("hidden");

    if (id === "dashboard") loadDashboard();
    if (id === "students") loadStudents();
    if (id === "submitted") loadHomework();
    if (id === "create-course") openCourseModal();      // optional: open modal right away
    if (id === "create-homework") openHomeworkModal();  // optional: open modal right away
  }

  // ===== Counter animation
  function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let count = 0;
    const step = target / 30;
    const interval = setInterval(() => {
      count += step;
      if (count >= target) {
        count = target;
        clearInterval(interval);
      }
      el.textContent = Math.floor(count);
    }, 20);
  }

  // ===== API helper
  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  // ===== DASHBOARD (courses list + delete + attachment link + edit)
  async function loadDashboard() {
    try {
      const [coursesRes, hwRes] = await Promise.all([
        fetch(`${API_BASE}/api/courses`),
        fetch(`${API_BASE}/api/homework`),
      ]);

      const courses = (await safeJson(coursesRes)) || [];
      const homework = (await safeJson(hwRes)) || [];

      animateCount("activeCoursesCount", Array.isArray(courses) ? courses.length : 0);
      animateCount("toGradeCount", Array.isArray(homework) ? homework.length : 0);

      const container = document.getElementById("courses");
      if (!container) return;

      container.innerHTML = (courses || [])
        .map((c) => {
          const attach =
            c.attachment?.url
              ? `<a class="text-xs underline opacity-80 hover:opacity-100" href="${c.attachment.url}" target="_blank">View file</a>`
              : `<span class="text-xs opacity-60">No file</span>`;

          const loc =
            c.location_type
              ? `<span class="text-xs opacity-70">${esc(c.location_type)}${c.location_detail ? " · " + esc(c.location_detail) : ""}</span>`
              : "";

          return `
          <article class="bg-white rounded-2xl border border-[#A5C8A1]/60 p-4 shadow-sm flex justify-between items-start gap-3">
            <div class="min-w-0">
              <h4 class="font-semibold text-[#1C1820] truncate">${esc(c.title)}</h4>
              <p class="text-sm opacity-80 mt-1">${esc(c.description || "")}</p>
              <div class="mt-2 flex items-center gap-3">
                ${loc}
                ${attach}
              </div>
              <p class="text-xs opacity-70 mt-2">Created by ${esc(c.created_by || "N/A")}</p>
            </div>

            <div class="flex gap-2 shrink-0">
              <button data-id="${c.id}" class="editCourseBtn px-3 py-1 rounded-lg bg-black/5 hover:bg-black/10 transition">✏️</button>
              <button data-id="${c.id}" class="deleteCourseBtn px-3 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition">🗑</button>
            </div>
          </article>`;
        })
        .join("");

      document.querySelectorAll(".deleteCourseBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this course?")) return;
          const res = await fetch(`${API_BASE}/api/courses/${btn.dataset.id}`, { method: "DELETE" });
          if (!res.ok) return showToast("Delete failed", "#b91c1c");
          showToast("Course deleted", "#b91c1c");
          loadDashboard();
        });
      });

      document.querySelectorAll(".editCourseBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const coursesRes2 = await fetch(`${API_BASE}/api/courses`);
          const courses2 = (await safeJson(coursesRes2)) || [];
          const course = courses2.find((x) => String(x.id) === String(btn.dataset.id));
          if (!course) return showToast("Course not found", "#b91c1c");
          openCourseModal(course);
        });
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      showToast("Dashboard load failed", "#b91c1c");
    }
  }

  // ===== STUDENTS
  async function loadStudents() {
    try {
      const res = await fetch(`${API_BASE}/api/students`);
      const data = (await safeJson(res)) || [];
      const table = document.getElementById("studentTable");
      if (!table) return;

      table.innerHTML = (data || [])
        .map(
          (s) => `
        <tr class="border-t">
          <td class="px-6 py-4 font-medium">${esc(s.name)}</td>
          <td class="px-6 py-4">${esc(s.course)}</td>
          <td class="px-6 py-4">${s.grade ?? "-"}</td>
          <td class="px-6 py-4 text-right">
            <button data-id="${s.enrollment_id}" data-grade="${s.grade ?? ""}"
              class="editBtn text-sm px-3 py-1.5 border border-[#A5C8A1] rounded-lg hover:bg-[#BFE3B4]/40">✏️</button>
          </td>
        </tr>`
        )
        .join("");

      document.querySelectorAll(".editBtn").forEach((btn) =>
        btn.addEventListener("click", () => openEditGradeModal(btn.dataset.id, btn.dataset.grade))
      );
    } catch (err) {
      console.error("Students load error:", err);
      showToast("Students load failed", "#b91c1c");
    }
  }

  // ===== HOMEWORK (list + delete + attachment link + edit)
  async function loadHomework() {
    try {
      const res = await fetch(`${API_BASE}/api/homework`);
      const hw = (await safeJson(res)) || [];
      const list = document.getElementById("homework-list");
      if (!list) return;

      list.innerHTML = (hw || [])
        .map((h) => {
          const attach =
            h.attachment?.url
              ? `<a class="text-xs underline opacity-80 hover:opacity-100" href="${h.attachment.url}" target="_blank">View file</a>`
              : `<span class="text-xs opacity-60">No file</span>`;

          const courseLabel = h.course_title || h.course || "";

          return `
          <div class="bg-white border border-[#A5C8A1]/60 p-4 rounded-xl shadow-sm relative text-left">
            <h3 class="font-semibold">${esc(h.title)}</h3>
            <p class="text-sm opacity-80">${esc(h.description || "")}</p>

            <div class="mt-2 flex items-center gap-3">
              <p class="text-xs opacity-70">By ${esc(h.submitted_by || "N/A")} · ${esc(courseLabel || "")}</p>
              ${attach}
            </div>

            <div class="absolute top-3 right-3 flex gap-2">
              <button data-id="${h.id}" class="editHomeworkBtn text-sm px-2 py-1 rounded bg-black/5 hover:bg-black/10">✏️</button>
              <button data-id="${h.id}" class="deleteHomeworkBtn text-rose-500 hover:text-rose-700">🗑</button>
            </div>
          </div>`;
        })
        .join("");

      document.querySelectorAll(".deleteHomeworkBtn").forEach((btn) =>
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this homework?")) return;
          const res2 = await fetch(`${API_BASE}/api/homework/${btn.dataset.id}`, { method: "DELETE" });
          if (!res2.ok) return showToast("Delete failed", "#b91c1c");
          showToast("Homework deleted", "#b91c1c");
          loadHomework();
          loadDashboard();
        })
      );

      document.querySelectorAll(".editHomeworkBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const res2 = await fetch(`${API_BASE}/api/homework`);
          const hw2 = (await safeJson(res2)) || [];
          const item = hw2.find((x) => String(x.id) === String(btn.dataset.id));
          if (!item) return showToast("Homework not found", "#b91c1c");
          openHomeworkModal(item);
        });
      });
    } catch (err) {
      console.error("Homework load error:", err);
      showToast("Homework load failed", "#b91c1c");
    }
  }

  // ===== CREATE / EDIT COURSE (FormData + file + location + created_by)
  function openCourseModal(existingCourse = null) {
    const isEdit = !!existingCourse;

    showModal(`
      <h2 class="text-xl font-semibold mb-4">${isEdit ? "Edit Course" : "Create Course"}</h2>

      <input id="courseTitle" type="text" placeholder="Course title"
        value="${isEdit ? esc(existingCourse.title) : ""}"
        class="w-full border rounded-lg px-3 py-2 mb-3" />

      <textarea id="courseDesc" placeholder="Description"
        class="w-full border rounded-lg px-3 py-2 mb-3">${isEdit ? esc(existingCourse.description || "") : ""}</textarea>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <select id="courseType" class="w-full border rounded-lg px-3 py-2">
          <option value="in-person">In-person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <input id="courseWhere" type="text" placeholder="Room / Link"
          value="${isEdit ? esc(existingCourse.location_detail || "") : ""}"
          class="w-full border rounded-lg px-3 py-2" />
      </div>

      <label class="block text-sm font-semibold mb-1">Attachment (optional)</label>
      <input id="courseFile" type="file" class="w-full border rounded-lg px-3 py-2 mb-4" />

      ${isEdit && existingCourse.attachment?.url ? `
        <div class="text-sm mb-4">
          Current file:
          <a class="underline" href="${existingCourse.attachment.url}" target="_blank">${esc(existingCourse.attachment.originalName || "View")}</a>
        </div>
      ` : ""}

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">
          ${isEdit ? "Save" : "Create"}
        </button>
      </div>
    `);

    // set selected type on edit
    if (isEdit) {
      const typeEl = document.getElementById("courseType");
      if (typeEl && existingCourse.location_type) typeEl.value = existingCourse.location_type;
    }

    document.getElementById("submitModal")?.addEventListener("click", async () => {
      const title = document.getElementById("courseTitle").value.trim();
      const description = document.getElementById("courseDesc").value.trim();
      const location_type = document.getElementById("courseType").value;
      const location_detail = document.getElementById("courseWhere").value.trim();
      const file = document.getElementById("courseFile").files[0];

      if (!title) return showToast("Title required!", "#b91c1c");

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("location_type", location_type);
      fd.append("location_detail", location_detail);
      if (isEdit) fd.append("updated_by", displayName);
      else fd.append("created_by", displayName);
      if (file) fd.append("file", file);

      const url = isEdit
        ? `${API_BASE}/api/courses/${existingCourse.id}`
        : `${API_BASE}/api/courses`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: fd
      });

      if (!res.ok) return showToast(isEdit ? "Save failed" : "Create failed", "#b91c1c");

      closeModal();
      showToast(isEdit ? "Course updated!" : "Course created!", "#166534");
      loadDashboard();
    });
  }

  // ===== CREATE / EDIT HOMEWORK (FormData + file + submitted_by)
  function openHomeworkModal(existing = null) {
    const isEdit = !!existing;

    showModal(`
      <h2 class="text-xl font-semibold mb-4">${isEdit ? "Edit Homework" : "Create Homework"}</h2>

      <input id="hwTitle" type="text" placeholder="Homework title"
        value="${isEdit ? esc(existing.title) : ""}"
        class="w-full border rounded-lg px-3 py-2 mb-3" />

      <textarea id="hwDesc" placeholder="Description"
        class="w-full border rounded-lg px-3 py-2 mb-3">${isEdit ? esc(existing.description || "") : ""}</textarea>

      <input id="hwCourseId" type="number" placeholder="Course ID"
        value="${isEdit ? esc(existing.course_id ?? "") : ""}"
        class="w-full border rounded-lg px-3 py-2 mb-3" />

      <label class="block text-sm font-semibold mb-1">Attachment (optional)</label>
      <input id="hwFile" type="file" class="w-full border rounded-lg px-3 py-2 mb-4" />

      ${isEdit && existing.attachment?.url ? `
        <div class="text-sm mb-4">
          Current file:
          <a class="underline" href="${existing.attachment.url}" target="_blank">${esc(existing.attachment.originalName || "View")}</a>
        </div>
      ` : ""}

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">
          ${isEdit ? "Save" : "Create"}
        </button>
      </div>
    `);

    document.getElementById("submitModal")?.addEventListener("click", async () => {
      const title = document.getElementById("hwTitle").value.trim();
      const description = document.getElementById("hwDesc").value.trim();
      const course_id = document.getElementById("hwCourseId").value;
      const file = document.getElementById("hwFile").files[0];

      if (!title || !course_id) return showToast("Title + Course ID required", "#b91c1c");

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("course_id", course_id);
      if (isEdit) fd.append("updated_by", displayName);
      else fd.append("submitted_by", displayName);
      if (file) fd.append("file", file);

      const url = isEdit
        ? `${API_BASE}/api/homework/${existing.id}`
        : `${API_BASE}/api/homework`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: fd
      });

      if (!res.ok) return showToast(isEdit ? "Save failed" : "Create failed", "#b91c1c");

      closeModal();
      showToast(isEdit ? "Homework updated!" : "Homework created!", "#166534");
      loadHomework();
      loadDashboard();
    });
  }

  // ===== EDIT GRADE
  function openEditGradeModal(id, grade) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Grade</h2>
      <input id="gradeInput" type="number" min="1" max="10" value="${esc(grade ?? "")}"
        class="w-full border rounded-lg px-3 py-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">Save</button>
      </div>
    `);

    document.getElementById("submitModal")?.addEventListener("click", async () => {
      const newGrade = Number(document.getElementById("gradeInput").value);
      if (isNaN(newGrade) || newGrade < 1 || newGrade > 10) {
        return showToast("Grade must be 1–10", "#b91c1c");
      }

      const res = await fetch(`${API_BASE}/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: newGrade }),
      });

      if (!res.ok) return showToast("Update failed", "#b91c1c");

      closeModal();
      showToast("Grade updated!", "#166534");
      loadStudents();
    });
  }

  // hook up create buttons (these exist on your create pages)
  document.getElementById("addCourseBtn")?.addEventListener("click", () => openCourseModal());
  document.getElementById("addHomeworkBtn")?.addEventListener("click", () => openHomeworkModal());

  // default page
  showPage("dashboard");
});
