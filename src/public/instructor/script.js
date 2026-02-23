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

  // ---- Dashboard ----
  async function loadDashboard() { /* ... keep existing ... */ }

  // ---- Students ----
  async function loadStudents() { /* ... keep existing ... */ }

  // ---- Homework ----
  async function loadHomework() { /* ... keep existing ... */ }

  // ---- Create Courses ----
  function openCourseModal() { /* ... keep existing ... */ }


  /* =====================================================
   COURSES SYSTEM — FULL REWRITE (SPA INTEGRATED)
===================================================== */

const COURSE_KEY = "instructor_courses";

/* ---------------------------
   STATE
--------------------------- */
let courses = JSON.parse(localStorage.getItem(COURSE_KEY) || "[]");
let activeCourseId = null;

function saveCourses() {
  localStorage.setItem(COURSE_KEY, JSON.stringify(courses));
}

/* ---------------------------
   UTIL
--------------------------- */
const uid = () => crypto.randomUUID();

function short(text, n = 90) {
  return text.length > n ? text.slice(0, n) + "..." : text;
}

/* ---------------------------
   MAIN ENTRY (called by router)
--------------------------- */
async function loadMyCourses() {
  buildCoursesLayout();
  renderCoursesGrid();
}

/* =====================================================
   LAYOUT
===================================================== */

function buildCoursesLayout() {
  const container = qs("#myCoursesContainer");

  container.innerHTML = `
  <div class="flex gap-6">

    <!-- COURSES SIDEBAR -->
    <aside id="coursesSidebar"
      class="w-72 shrink-0 glass rounded-2xl p-4 space-y-4">

      <input id="courseSearch"
        placeholder="Search..."
        class="w-full border rounded-xl px-3 py-2 text-sm" />

      <select id="filterState" class="w-full border rounded-xl px-3 py-2 text-sm">
        <option value="">All states</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>

      <button id="newCourseBtn" class="btn-primary w-full">
        + New Course
      </button>

      <div class="glass rounded-xl p-3 text-xs text-center opacity-70">
        📅 Calendar demo
      </div>
    </aside>

    <!-- CONTENT -->
    <section id="coursesContent" class="flex-1">
      <div id="coursesGrid"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
    </section>

  </div>
  `;

  qs("#newCourseBtn").onclick = openCourseModal;
  qs("#courseSearch").oninput = renderCoursesGrid;
  qs("#filterState").onchange = renderCoursesGrid;
}

/* =====================================================
   GRID
===================================================== */

function renderCoursesGrid() {
  const grid = qs("#coursesGrid");

  let list = [...courses];

  const q = qs("#courseSearch").value.toLowerCase();
  const state = qs("#filterState").value;

  if (q) list = list.filter(c => c.title.toLowerCase().includes(q));
  if (state) list = list.filter(c => c.state === state);

  if (!list.length) {
    grid.innerHTML = `
      <div class="col-span-full glass p-8 text-center rounded-2xl">
        <p class="subtitle">No courses yet</p>
        <button class="btn-primary mt-3" onclick="openCourseModal()">Create your first course</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(c => `
    <div class="glass rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition"
      onclick="openCourseDetail('${c.id}')">

      <img src="${c.cover || 'https://picsum.photos/500'}"
        class="h-36 w-full object-cover"/>

      <div class="p-4 space-y-2">
        <div class="font-semibold">${c.title}</div>
        <div class="text-xs opacity-70">${short(c.description)}</div>

        <div class="text-xs flex gap-2 flex-wrap">
          <span>📍 ${c.location}</span>
          <span>⏱ ${c.duration}</span>
          <span class="px-2 py-0.5 rounded bg-black/10">${c.state}</span>
        </div>
      </div>
    </div>
  `).join("");
}

/* =====================================================
   CREATE / EDIT MODAL
===================================================== */

function openCourseModal(editId = null) {
  const edit = courses.find(c => c.id === editId);

  showModal(`
    <h3 class="text-lg font-semibold mb-4">
      ${edit ? "Edit Course" : "New Course"}
    </h3>

    <form id="courseForm" class="space-y-3 text-sm">

      <input id="title" placeholder="Title"
        class="w-full border rounded-xl px-3 py-2" value="${edit?.title || ""}" required>

      <textarea id="desc" placeholder="Description"
        class="w-full border rounded-xl px-3 py-2">${edit?.description || ""}</textarea>

      <input id="cover" placeholder="Cover image URL"
        class="w-full border rounded-xl px-3 py-2" value="${edit?.cover || ""}">

      <input id="duration" placeholder="Duration (ex: 3 hours)"
        class="w-full border rounded-xl px-3 py-2" value="${edit?.duration || ""}">

      <select id="location" class="w-full border rounded-xl px-3 py-2">
        <option>online</option>
        <option>in person</option>
        <option>both</option>
      </select>

      <div class="flex gap-2">
        <button type="submit" class="btn-primary flex-1">Save</button>
        <button id="cancelModal" type="button" class="border px-4 rounded-xl">Cancel</button>
      </div>
    </form>
  `);

  qs("#courseForm").onsubmit = e => {
    e.preventDefault();

    const data = {
      id: edit?.id || uid(),
      title: qs("#title").value,
      description: qs("#desc").value,
      cover: qs("#cover").value,
      duration: qs("#duration").value,
      location: qs("#location").value,
      state: edit?.state || "draft",
      chapters: edit?.chapters || [],
      publisher: localStorage.getItem("userName") || "Instructor",
      createdAt: Date.now()
    };

    if (edit) {
      courses = courses.map(c => c.id === editId ? data : c);
    } else {
      courses.unshift(data);
    }

    saveCourses();
    closeModal();
    renderCoursesGrid();
  };
}

/* =====================================================
   DETAIL PAGE
===================================================== */

function openCourseDetail(id) {
  activeCourseId = id;
  const c = courses.find(x => x.id === id);

  qs("#coursesContent").innerHTML = `
    <button onclick="renderCoursesGrid()" class="mb-4 text-sm opacity-70">
      ← Back
    </button>

    <div class="glass rounded-2xl p-6 space-y-4">

      <img src="${c.cover}" class="w-full h-60 object-cover rounded-xl"/>

      <div class="flex justify-between">
        <h2 class="text-xl font-semibold">${c.title}</h2>

        <div class="flex gap-2">
          <button onclick="openCourseModal('${c.id}')" class="btn-primary">Edit</button>
          <button onclick="deleteCourse('${c.id}')" class="border rounded-xl px-3">Delete</button>
        </div>
      </div>

      <p class="opacity-80">${c.description}</p>

      <div class="text-sm flex gap-6">
        <span>📍 ${c.location}</span>
        <span>⏱ ${c.duration}</span>
        <span>📚 ${c.chapters.length} chapters</span>
      </div>

      <div class="pt-4 border-t">
        <button onclick="addChapter()" class="btn-primary">+ Add Chapter</button>

        <div id="chaptersList" class="space-y-2 mt-3"></div>
      </div>

    </div>
  `;

  renderChapters();
}

/* =====================================================
   CHAPTERS
===================================================== */

function renderChapters() {
  const c = courses.find(x => x.id === activeCourseId);
  const list = qs("#chaptersList");

  list.innerHTML = c.chapters.map((ch,i)=>`
    <div class="glass rounded-xl p-3 flex justify-between">
      <span>${i+1}. ${ch.title}</span>
      <button onclick="removeChapter(${i})">✕</button>
    </div>
  `).join("");
}

function addChapter() {
  const title = prompt("Chapter title");
  if(!title) return;

  const c = courses.find(x => x.id === activeCourseId);
  c.chapters.push({ title });

  saveCourses();
  renderChapters();
}

function removeChapter(i) {
  const c = courses.find(x => x.id === activeCourseId);
  c.chapters.splice(i,1);
  saveCourses();
  renderChapters();
}

/* =====================================================
   DELETE
===================================================== */

function deleteCourse(id) {
  if(!confirm("Delete this course?")) return;
  courses = courses.filter(c=>c.id!==id);
  saveCourses();
  renderCoursesGrid();
}


    // ---- inject HTML into container ----
    container.innerHTML = html;

    // ---- execute scripts from courses.html ----
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const scripts = [...tempDiv.querySelectorAll("script")];
    scripts.forEach((s) => {
      const newS = document.createElement("script");
      if (s.src) newS.src = s.src;
      else newS.textContent = s.textContent;
      document.body.appendChild(newS);
      newS.remove(); // cleanup after running
    });
  });

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
