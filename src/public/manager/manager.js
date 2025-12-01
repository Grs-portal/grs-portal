// manager.js
(() => {
  const API_BASE = "/api"; // server runs at same origin; adjust if needed

  // helpers
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className = "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg fade-in";
    t.style.backgroundColor = color;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  };
  const escapeHtml = str => (String(str || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"));

  // Modal system
  function showModal(html) {
    if (qs("#modalBg")) return;
    const bg = document.createElement("div");
    bg.id = "modalBg";
    bg.className = "fixed inset-0 bg-black/40 flex items-center justify-center z-50";
    bg.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-lg w-[90%] max-w-md">${html}</div>`;
    document.body.appendChild(bg);

    bg.addEventListener("click", (e) => { if (e.target === bg) closeModal(); });
    const cancel = bg.querySelector("#cancelModal");
    if (cancel) cancel.addEventListener("click", closeModal);

    return bg;
  }
  function closeModal() { const el = qs("#modalBg"); if (el) el.remove(); }

  // auth + init
  document.addEventListener("DOMContentLoaded", init);
  async function init() {
    if (!localStorage.getItem("isLoggedIn")) { location.href = "/login.html"; return; }
    // Optionally enforce role === 'manager'
    const role = localStorage.getItem("role");
    if (role && role !== "manager") {
      // if not manager, still let them in if you want — currently block
      // location.href = "/login.html";
    }

    // topbar name/avatar
    const name = localStorage.getItem("userName") || "Manager";
    const avatar = localStorage.getItem("userAvatar");
    if (qs("#userName")) qs("#userName").textContent = name;
    if (qs("#userAvatar")) {
      if (avatar) {
        qs("#userAvatar").style.backgroundImage = `url(${avatar})`;
        qs("#userAvatar").style.backgroundSize = "cover";
      } else {
        qs("#userAvatar").textContent = name.split(" ").map(n => n[0]||"").join("").toUpperCase();
      }
    }

    // sidebar mobile
    const menuBtn = qs("#menuBtn"), sidebar = qs("#sidebar"), overlay = qs("#overlay");
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

    setupProfileDropdown();
    setupNavigation();
    bindButtons();
    await loadDashboard(); // initial load
    document.getElementById("y").textContent = new Date().getFullYear();
  }

  // profile dropdown (logout only)
  function setupProfileDropdown() {
    const wrap = qs("#topAvatarWrap");
    if (!wrap) return;
    // create menu if missing
    if (!qs("#profileMenu")) {
      const menu = document.createElement("div");
      menu.id = "profileMenu";
      menu.className = "absolute right-0 mt-2 bg-[#3E3B59] text-[#F2F0E5] rounded-lg shadow-lg hidden";
      menu.style.minWidth = "160px";
      menu.innerHTML = `<div class="py-1"><button id="pm-logout" class="w-full text-left px-4 py-2 hover:bg-[#4E4A69]">Logout</button></div>`;
      wrap.appendChild(menu);
      qs("#userAvatar")?.addEventListener("click", () => menu.classList.toggle("hidden"));
      menu.querySelector("#pm-logout").addEventListener("click", () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role");
        // keep optionally the name/avatar if you want, but we clear here
        localStorage.removeItem("userName");
        localStorage.removeItem("userAvatar");
        location.href = "/login.html";
      });
      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target) && !menu.contains(e.target)) menu.classList.add("hidden");
      });
    }
  }

  // navigation wiring
  function setupNavigation() {
    const items = qsa(".nav-item");
    const pages = qsa(".page-section");
    items.forEach(it => it.addEventListener("click", async (e) => {
      e.preventDefault();
      const page = it.dataset.page;
      pages.forEach(p => p.classList.add("hidden"));
      const target = qs(`#${page}`);
      if (target) target.classList.remove("hidden");
      items.forEach(n => n.classList.remove("active"));
      it.classList.add("active");

      // load page data
      if (page === "dashboard") await loadDashboard();
      if (page === "students") await loadStudents();
      if (page === "submitted-homework") await loadHomework();
      if (page === "submitted-courses") await loadCourses();
      if (page === "projects") await renderProjectsFull();
    }));
    // make dashboard default shown
    // note: initial loadDashboard already called during init
  }

  // wire create buttons
  function bindButtons() {
    qs("#createProjectBtn")?.addEventListener("click", openCreateProjectModal);
    qs("#createCourseBtn")?.addEventListener("click", openCreateCourseModal);
    qs("#openCreateHw")?.addEventListener("click", openCreateHomeworkModal);
    qs("#createProjectBtn")?.addEventListener("click", openCreateProjectModal);
    qs("#createCourseBtn")?.addEventListener("click", openCreateCourseModal);
    qs("#openCreateHw")?.addEventListener("click", openCreateHomeworkModal);
  }

  // ----------------- DASHBOARD LOAD -----------------
  async function loadDashboard() {
  try {
    const [coursesRes, hwRes, projectsRes] = await Promise.all([
      fetch(`${API_BASE}/courses`),
      fetch(`${API_BASE}/homework`),
      fetch(`${API_BASE}/projects`)
    ]);

    const courses = await safeJson(coursesRes);
    const homework = await safeJson(hwRes);
    const projects = await safeJson(projectsRes);

    // Dashboard stats
    qs("#activeCoursesCount").textContent = courses.length;
    qs("#toGradeCount").textContent = homework.length;

    // ====== RENDER COURSES ON DASHBOARD ======
    const courseBox = qs("#courses");
    courseBox.innerHTML = courses.map(c => `
      <div class="bg-white p-4 rounded-xl shadow border flex justify-between items-center">
        <div>
          <h3 class="font-semibold">${escapeHtml(c.title)}</h3>
          <p class="text-sm text-[#3E3B59]">${escapeHtml(c.description || "")}</p>
        </div>
        <button data-id="${c.id}" class="btn-del-course px-3 py-1 rounded bg-red-100 text-red-600">🗑</button>
      </div>
    `).join("");

    // ====== RENDER PROJECTS ON DASHBOARD ======
    const projBox = qs("#dashboardProjects");
    projBox.innerHTML = projects.map(p => `
      <div class="bg-white p-4 rounded-xl shadow border flex justify-between items-center">
        <div>
          <h3 class="font-semibold">${escapeHtml(p.title)}</h3>
          <p class="text-sm text-[#3E3B59]">${escapeHtml(p.description || "")}</p>
        </div>
        <button data-id="${p.id}" class="btn-del-project px-3 py-1 rounded bg-red-100 text-red-600">🗑</button>
      </div>
    `).join("");

    // ===== DELETE COURSE HANDLERS =====
    qsa(".btn-del-course").forEach(btn => btn.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm("Delete course?")) return;
      await fetch(`${API_BASE}/courses/${id}`, { method: "DELETE" });
      loadDashboard();
    }));

    // ===== DELETE PROJECT HANDLERS =====
    qsa(".btn-del-project").forEach(btn => btn.addEventListener("click", async e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm("Delete project?")) return;
      await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
      loadDashboard();
    }));

  } catch (err) {
    console.error("loadDashboard error:", err);
  }
}


  // ----------------- COURSES -----------------
  async function openCreateCourseModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create Course</h2>
      <input id="courseTitle" type="text" placeholder="Title" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="courseDesc" placeholder="Description" class="w-full border rounded-lg px-3 py-2 mb-3"></textarea>
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitCourse" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Create</button>
      </div>
    `);
    qs("#submitCourse").addEventListener("click", async () => {
      const title = qs("#courseTitle").value.trim();
      const description = qs("#courseDesc").value.trim();
      if (!title) { toast("Title required", "#b91c1c"); return; }
      try {
        await fetch(`${API_BASE}/courses`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ title, description })
        });
        closeModal(); toast("Course created", "#166534"); await loadDashboard();
      } catch (err) { console.error(err); toast("Create failed", "#b91c1c"); }
    });
  }

  async function openEditCourseModal(course) {
    if (!course) return;
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Course</h2>
      <input id="courseTitle" type="text" value="${escapeHtml(course.title)}" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="courseDesc" class="w-full border rounded-lg px-3 py-2 mb-3">${escapeHtml(course.description || "")}</textarea>
      <div class="flex justify-between gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <div class="flex gap-2">
          <button id="deleteCourse" class="px-4 py-2 bg-rose-600 text-white rounded-lg">Delete</button>
          <button id="submitCourse" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Save</button>
        </div>
      </div>
    `);
    qs("#deleteCourse").addEventListener("click", async () => {
      if (!confirm("Delete course?")) return;
      try {
        await fetch(`${API_BASE}/courses/${course.id}`, { method: "DELETE" });
        closeModal(); toast("Deleted", "#b91c1c"); await loadDashboard();
      } catch (err) { console.error(err); toast("Delete failed", "#b91c1c"); }
    });
    qs("#submitCourse").addEventListener("click", async () => {
      const title = qs("#courseTitle").value.trim();
      const description = qs("#courseDesc").value.trim();
      try {
        await fetch(`${API_BASE}/courses/${course.id}`, {
          method: "PUT", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ title, description })
        });
        closeModal(); toast("Saved", "#166534"); await loadDashboard();
      } catch (err) { console.error(err); toast("Save failed", "#b91c1c"); }
    });
  }

  // ----------------- PROJECTS -----------------
  async function openCreateProjectModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create Project</h2>
      <input id="projTitle" type="text" placeholder="Title" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="projDesc" placeholder="Description" class="w-full border rounded-lg px-3 py-2 mb-3"></textarea>
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitProj" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Create</button>
      </div>
    `);
    qs("#submitProj").addEventListener("click", async () => {
      const title = qs("#projTitle").value.trim();
      const description = qs("#projDesc").value.trim();
      if (!title) { toast("Title required", "#b91c1c"); return; }
      try {
        await fetch(`${API_BASE}/projects`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ title, description })
        });
        closeModal(); toast("Project created", "#166534"); await loadDashboard();
      } catch (err) { console.error(err); toast("Create failed", "#b91c1c"); }
    });
  }

  async function openEditProjectModal(project) {
    if (!project) return;
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Project</h2>
      <input id="projTitle" type="text" value="${escapeHtml(project.title)}" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="projDesc" class="w-full border rounded-lg px-3 py-2 mb-3">${escapeHtml(project.description || "")}</textarea>
      <div class="flex justify-between gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <div class="flex gap-2">
          <button id="deleteProj" class="px-4 py-2 bg-rose-600 text-white rounded-lg">Delete</button>
          <button id="submitProj" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Save</button>
        </div>
      </div>
    `);
    qs("#deleteProj").addEventListener("click", async () => {
      if (!confirm("Delete project?")) return;
      try {
        await fetch(`${API_BASE}/projects/${project.id}`, { method: "DELETE" });
        closeModal(); toast("Deleted", "#b91c1c"); await loadDashboard();
      } catch (err) { console.error(err); toast("Delete failed", "#b91c1c"); }
    });
    qs("#submitProj").addEventListener("click", async () => {
      const title = qs("#projTitle").value.trim();
      const description = qs("#projDesc").value.trim();
      try {
        await fetch(`${API_BASE}/projects/${project.id}`, {
          method: "PUT", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ title, description })
        });
        closeModal(); toast("Saved", "#166534"); await loadDashboard();
      } catch (err) { console.error(err); toast("Save failed", "#b91c1c"); }
    });
  }

  async function renderProjectsFull() {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await safeJson(res);
      const container = qs("#projectsFullList");
      container.innerHTML = (data || []).map(p => `
        <div class="card flex justify-between items-center">
          <div>
            <strong>${escapeHtml(p.title)}</strong>
            <div class="text-xs text-[#3E3B59]">${escapeHtml(p.description || "")}</div>
          </div>
          <div class="flex gap-2">
            <button data-id="${p.id}" class="btn-edit-project px-2 py-1 text-sm border rounded">Edit</button>
            <button data-id="${p.id}" class="btn-del-project px-2 py-1 text-sm border rounded">Delete</button>
          </div>
        </div>
      `).join("");
      qsa(".btn-del-project").forEach(b => b.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Delete project?")) return;
        await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
        toast("Deleted", "#b91c1c"); renderProjectsFull();
      }));
      qsa(".btn-edit-project").forEach(b => b.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const existing = (data || []).find(x => String(x.id) === String(id));
        openEditProjectModal(existing);
      }));
    } catch (err) { console.error(err); toast("Failed to load projects", "#b91c1c"); }
  }

  // ----------------- HOMEWORK -----------------
  function openCreateHomeworkModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create Homework</h2>
      <input id="hwTitle" type="text" placeholder="Title" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="hwDesc" placeholder="Description" class="w-full border rounded-lg px-3 py-2 mb-3"></textarea>
      <input id="hwCourse" type="text" placeholder="Course name" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <input id="hwBy" type="text" placeholder="Submitted by (name)" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitHw" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Create</button>
      </div>
    `);
    qs("#submitHw").addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      const submitted_by = qs("#hwBy").value.trim();
      if (!title || !course) { toast("Title & course required", "#b91c1c"); return; }
      try {
        await fetch(`${API_BASE}/homework`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ title, description, course, submitted_by })
        });
        closeModal(); toast("Homework created", "#166534"); await loadHomework(); await loadDashboard();
      } catch (err) { console.error(err); toast("Create failed", "#b91c1c"); }
    });
  }

  async function loadHomework() {
    try {
      const res = await fetch(`${API_BASE}/homework`);
      const data = await safeJson(res);
      const list = qs("#homework-list");
      list.innerHTML = (data || []).map(h => `
        <div class="card">
          <div>
            <h4 class="font-semibold">${escapeHtml(h.title)}</h4>
            <p class="text-sm text-[#3E3B59]">${escapeHtml(h.description || "")}</p>
            <div class="text-xs text-[#3E3B59] mt-2">Submitted by ${escapeHtml(h.submitted_by || "N/A")} · ${escapeHtml(h.course || "")}</div>
          </div>
          <div class="mt-2 flex gap-2">
            <button data-id="${h.id}" class="btn-edit-hw px-2 py-1 text-sm border rounded">Edit</button>
            <button data-id="${h.id}" class="btn-del-hw px-2 py-1 text-sm border rounded">Delete</button>
          </div>
        </div>
      `).join("");
      qsa(".btn-del-hw").forEach(b => b.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Delete homework?")) return;
        await fetch(`${API_BASE}/homework/${id}`, { method: "DELETE" });
        toast("Deleted", "#b91c1c"); loadHomework(); loadDashboard();
      }));
      qsa(".btn-edit-hw").forEach(b => b.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const listData = data || [];
        const existing = listData.find(x => String(x.id) === String(id));
        openEditHomeworkModal(existing);
      }));
    } catch (err) { console.error(err); toast("Failed to load homework", "#b91c1c"); }
  }

  function openEditHomeworkModal(hw) {
    if (!hw) return;
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Homework</h2>
      <input id="hwTitle" type="text" value="${escapeHtml(hw.title)}" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="hwDesc" class="w-full border rounded-lg px-3 py-2 mb-3">${escapeHtml(hw.description || "")}</textarea>
      <input id="hwCourse" type="text" value="${escapeHtml(hw.course || "")}" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <input id="hwBy" type="text" value="${escapeHtml(hw.submitted_by || "")}" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <div class="flex justify-between gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <div class="flex gap-2">
          <button id="deleteHw" class="px-4 py-2 bg-rose-600 text-white rounded-lg">Delete</button>
          <button id="submitHw" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Save</button>
        </div>
      </div>
    `);
    qs("#deleteHw").addEventListener("click", async () => {
      if (!confirm("Delete homework?")) return;
      try {
        await fetch(`${API_BASE}/homework/${hw.id}`, { method: "DELETE" });
        closeModal(); toast("Deleted", "#b91c1c"); await loadHomework(); await loadDashboard();
      } catch (err) { console.error(err); toast("Delete failed", "#b91c1c"); }
    });
    qs("#submitHw").addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      const submitted_by = qs("#hwBy").value.trim();
      try {
        await fetch(`${API_BASE}/homework/${hw.id}`, {
          method: "PUT", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ title, description, course, submitted_by })
        });
        closeModal(); toast("Saved", "#166534"); await loadHomework(); await loadDashboard();
      } catch (err) { console.error(err); toast("Save failed", "#b91c1c"); }
    });
  }

  // ----------------- STUDENTS -----------------
  async function loadStudents() {
    try {
      const res = await fetch(`${API_BASE}/students`);
      const students = await safeJson(res);
      const table = qs("#studentTable");
      table.innerHTML = (students || []).map(s => `
        <tr>
          <td class="px-6 py-4">${escapeHtml(s.name)}</td>
          <td class="px-6 py-4">${escapeHtml(s.course)}</td>
          <td class="px-6 py-4">${s.grade ?? "-"}</td>
          <td class="px-6 py-4 text-right">
            <button data-id="${s.enrollment_id}" data-grade="${s.grade}" class="btn-edit-grade px-3 py-1 border rounded text-sm">Edit</button>
          </td>
        </tr>
      `).join("");

      qsa(".btn-edit-grade").forEach(btn => btn.addEventListener("click", (e) => {
        const id = btn.dataset.id;
        const current = btn.dataset.grade;
        openEditGradeModal(id, current);
      }));
    } catch (err) { console.error(err); toast("Failed to load students", "#b91c1c"); }
  }

  function openEditGradeModal(id, grade) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Grade</h2>
      <input id="gradeInput" type="number" min="0" max="100" value="${grade ?? ""}" class="w-full border rounded-lg px-3 py-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitGrade" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg">Save</button>
      </div>
    `);
    qs("#submitGrade").addEventListener("click", async () => {
      const newGrade = Number(qs("#gradeInput").value);
      if (isNaN(newGrade)) { toast("Invalid grade", "#b91c1c"); return; }
      try {
        await fetch(`${API_BASE}/students/${id}`, {
          method: "PUT", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ grade: newGrade })
        });
        closeModal(); toast("Grade updated", "#166534"); await loadStudents(); await loadDashboard();
      } catch (err) { console.error(err); toast("Update failed", "#b91c1c"); }
    });
  }

  // ----------------- UTIL -----------------
  async function safeJson(res) {
    if (!res.ok) return [];
    try { return await res.json(); } catch (e) { return []; }
  }

})();
