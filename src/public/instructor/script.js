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

  // Avatar initial (optional, but nice)
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

    // Remove active class from all
    qsa(".nav-item").forEach((el) => el.classList.remove("active"));
    link.classList.add("active");

    // Hide all page sections
    qsa(".page-section").forEach((s) => s.classList.add("hidden"));

    // Show the selected page
    const page = link.dataset.page;
    const section = qs(`#${page}`);
    section?.classList.remove("hidden");

    // Load data if “My Courses”
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
    // keep name/username if you want, but usually clear:
    // localStorage.removeItem("username");
    // localStorage.removeItem("userName");
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

  // ---- Homework list ----
  async function loadHomework() {
    const hw = await fetchJSON("/homework");
    const list = qs("#homework-list");
    if (!list) return;

    list.innerHTML = hw
      .map(
        (h) => `
      <div class="bg-white border border-[#A5C8A1]/60 p-4 rounded-xl shadow-sm flex justify-between items-start">
        <div>
          <h3 class="font-semibold">${esc(h.title)}</h3>
          <p class="text-sm opacity-80">${esc(h.description || "")}</p>
          <p class="text-xs opacity-70 mt-2">By: ${esc(
            h.submitted_by || "N/A"
          )} · ${esc(h.course || "")}</p>
          ${
            h.pdfUrl
              ? `<a class="text-xs underline text-green-800" href="${esc(
                  h.pdfUrl
                )}" target="_blank">PDF: ${esc(h.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="editHwBtn px-2 py-1 rounded hover:bg-black/5" data-id="${h.id}">✏️</button>
          <button class="deleteHomeworkBtn text-rose-600 px-2 py-1 rounded hover:bg-rose-50" data-id="${h.id}">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    qsa(".deleteHomeworkBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this homework?")) return;
        const r = await fetch(`${API}/homework/${btn.dataset.id}`, {
          method: "DELETE",
          headers: actorHeaders(),
        });
        if (!r.ok) return toast("Delete failed", "#b91c1c");
        toast("Homework deleted", "#b91c1c");
        loadHomework();
        loadDashboard();
        loadNotifications();
      });
    });

    qsa(".editHwBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const hwNow = await fetchJSON("/homework");
        const found = hwNow.find((x) => String(x.id) === String(id));
        if (found) openEditHomeworkModal(found);
      });
    });
  }

  // ---- Students ----
  async function loadStudents() {
    try {
      const res = await fetch(`${API}/students`);
      const data = await safeJson(res);
      const table = qs("#studentTable");
      if (!table) return;

      const arr = Array.isArray(data) ? data : [];
      table.innerHTML = arr
        .map(
          (s) => `
        <tr>
          <td class="px-6 py-4 font-medium">${esc(s.name)}</td>
          <td class="px-6 py-4">${esc(s.course)}</td>
          <td class="px-6 py-4">${s.grade ?? "-"}</td>
          <td class="px-6 py-4 text-right">
            <button data-id="${esc(s.enrollment_id)}" data-grade="${esc(
            s.grade ?? ""
          )}" class="editBtn text-sm px-3 py-1.5 border rounded-lg hover:bg-black/5">✏️</button>
          </td>
        </tr>
      `
        )
        .join("");

      qsa(".editBtn").forEach((btn) => {
        btn.addEventListener("click", () =>
          openEditGradeModal(btn.dataset.id, btn.dataset.grade)
        );
      });
    } catch {
      // silent fail
    }
  }

  function openEditGradeModal(id, grade) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Grade</h2>
      <input id="gradeInput" type="number" min="1" max="10" value="${esc(
        grade
      )}"
        class="w-full border rounded-lg px-3 py-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">Save</button>
      </div>
    `);

    qs("#submitModal")?.addEventListener("click", async () => {
      const newGrade = Number(qs("#gradeInput").value);
      if (isNaN(newGrade) || newGrade < 1 || newGrade > 10)
        return toast("Grade must be 1–10", "#b91c1c");

      const r = await fetch(`${API}/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: newGrade }),
      });

      if (!r.ok) return toast("Update failed", "#b91c1c");
      closeModal();
      toast("Grade updated", "#166534");
      loadStudents();
    });
  }


/* ══════════════════✿══╡°˖✧᯽   CREATE COURSES   ᯽✧˖°╞══✿══════════════════*/
  // ... ✿°•∘ɷ∘•°✿ .. basically just adding the extra data needed for the front-page.
  
function openCourseModal() {
  showModal(`
    <h2 class="text-xl font-semibold mb-4">Create Course</h2>

    <input id="courseTitle"
      placeholder="Course title"
      class="w-full border rounded-lg px-3 py-2 mb-3" />

    <textarea id="courseDesc"
      placeholder="Description"
      class="w-full border rounded-lg px-3 py-2 mb-3"></textarea>

    <input id="courseDuration"
      placeholder="Duration (e.g. 6 weeks)"
      class="w-full border rounded-lg px-3 py-2 mb-3" />

    <select id="courseType"
      class="w-full border rounded-lg px-3 py-2 mb-3">
      <option value="online">Online</option>
      <option value="in-person">In-person</option>
      <option value="hybrid">Hybrid</option>
    </select>

    <input id="courseCover"
      type="file"
      accept="image/*"
      class="w-full mb-4" />

    <h3 class="font-semibold mb-2">Chapters</h3>
    <div id="chaptersContainer" class="mb-3"></div>
    <button id="addChapterBtn" class="px-3 py-1 mb-4 bg-gray-200 rounded hover:bg-gray-300">+ Add Chapter</button>

    <div class="flex justify-end gap-2">
      <button id="cancelModal"
        class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
        Cancel
      </button>
      <button id="submitModal"
        class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">
        Create
      </button>
    </div>
  `);

  const chaptersContainer = qs("#chaptersContainer");

  // ... ✿°•∘ɷ∘•°✿ .. Add Chapter 
  qs("#addChapterBtn")?.addEventListener("click", () => {
    const chapterDiv = document.createElement("div");
    chapterDiv.className = "chapterForm border p-2 mb-2 rounded";

    chapterDiv.innerHTML = `
      <input type="text" placeholder="Chapter title" class="chapterTitle mb-1 w-full border rounded px-2 py-1" />
      <textarea placeholder="Chapter description" class="chapterDesc mb-1 w-full border rounded px-2 py-1"></textarea>
      <input type="file" accept="image/*,.pdf,video/mp4" class="chapterCover mb-1 w-full" />
      <input type="url" placeholder="Optional link" class="chapterLink mb-1 w-full border rounded px-2 py-1" />
      <button class="removeChapterBtn text-sm text-red-600 mb-1">Remove</button>
    `;

    chapterDiv.querySelector(".removeChapterBtn")?.addEventListener("click", () => {
      chapterDiv.remove();
    });

    chaptersContainer.appendChild(chapterDiv);
  });

  // ... ✿°•∘ɷ∘•°✿ .. Create Course  
  qs("#submitModal")?.addEventListener("click", async () => {
    const title = qs("#courseTitle").value.trim();
    const description = qs("#courseDesc").value.trim();
    const duration = qs("#courseDuration").value.trim();
    const courseType = qs("#courseType").value;
    const coverFile = qs("#courseCover")?.files?.[0];

    if (!title) return toast("Title required", "#b91c1c");

    let cover = "/images/course-placeholder.jpg";
    if (coverFile) {
      try {
        const up = await uploadFile(coverFile);
        cover = up.url;
      } catch (e) {
        return toast(e.message, "#b91c1c");
      }
    }

    // ... ✿°•∘ɷ∘•°✿ .. Process Chapters  
    const chapterForms = [...document.querySelectorAll(".chapterForm")];
    const chapters = [];

    for (let ch of chapterForms) {
      const chTitle = ch.querySelector(".chapterTitle").value.trim();
      if (!chTitle) continue; // skip empty chapters

      const chDesc = ch.querySelector(".chapterDesc").value.trim();
      const chLink = ch.querySelector(".chapterLink").value.trim();
      let chCoverUrl = "";

      const chFile = ch.querySelector(".chapterCover")?.files?.[0];
      if (chFile) {
        try {
          const up = await uploadFile(chFile);
          chCoverUrl = up.url;
        } catch (e) {
          return toast(`Chapter upload failed: ${e.message}`, "#b91c1c");
        }
      }

      chapters.push({
        title: chTitle,
        description: chDesc,
        cover: chCoverUrl,
        link: chLink,
      });
    }

    // ... ✿°•∘ɷ∘•°✿ .. Course payload  
    const payload = {
      title,
      description,
      duration,
      courseType,
      cover,
      chapters,
      teacher: {
        name: localStorage.getItem("userName") || "Instructor",
        photo: "/images/teacher-placeholder.jpg",
      },
      reviews: [],
    };

    try {
      const r = await fetch(`${API}/courses`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Create failed");

      closeModal();
      toast("Course created!", "#166534");
      loadDashboard();
    } catch (e) {
      toast(e.message, "#b91c1c");
    }
  });
}

// ... ✿°•∘ɷ∘•°✿ .. Generalized upload for images, PDFs, videos  
async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
  const out = await res.json();
  if (!res.ok || !out?.success) throw new Error(out?.message || "Upload failed");
  return out;
}


  
// ---- Create/Edit Homework ----
  function openHomeworkModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create Homework</h2>
      <input id="hwTitle" type="text" placeholder="Homework title" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="hwDesc" placeholder="Description" class="w-full border rounded-lg px-3 py-2 mb-3"></textarea>
      <input id="hwCourse" type="text" placeholder="Course name" class="w-full border rounded-lg px-3 py-2 mb-3" />

      <input id="hwPdf" type="file" accept=".pdf" class="w-full mb-4" />

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">Create</button>
      </div>
    `);

    qs("#submitModal")?.addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      if (!title || !course) return toast("Title + Course required", "#b91c1c");

      let pdfUrl = "",
        pdfName = "";
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

      const r = await fetch(`${API}/homework`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, course, pdfUrl, pdfName }),
      });

      if (!r.ok) return toast("Create failed", "#b91c1c");

      closeModal();
      toast("Homework created!", "#166534");
      loadHomework();
      loadDashboard();
      loadNotifications();
    });
  }

  function openEditHomeworkModal(hw) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Homework</h2>
      <input id="hwTitle" class="w-full border rounded-lg px-3 py-2 mb-3" value="${esc(
        hw.title
      )}" />
      <textarea id="hwDesc" class="w-full border rounded-lg px-3 py-2 mb-3">${esc(
        hw.description || ""
      )}</textarea>
      <input id="hwCourse" class="w-full border rounded-lg px-3 py-2 mb-3" value="${esc(
        hw.course || ""
      )}" />

      <div class="text-xs opacity-70 mb-2">${
        hw.pdfUrl ? `Current PDF: ${esc(hw.pdfName || "Attached")}` : "No PDF attached"
      }</div>
      <input id="hwPdf" type="file" accept=".pdf" class="w-full mb-4" />

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">Save</button>
      </div>
    `);

    qs("#submitModal")?.addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      if (!title || !course) return toast("Title + Course required", "#b91c1c");

      let pdfUrl = hw.pdfUrl || "",
        pdfName = hw.pdfName || "";
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

      const r = await fetch(`${API}/homework/${hw.id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, course, pdfUrl, pdfName }),
      });

      if (!r.ok) return toast("Update failed", "#b91c1c");
      closeModal();
      toast("Homework updated!", "#166534");
      loadHomework();
      loadDashboard();
      loadNotifications();
    });
  }

  // ---- Page router + nav (THIS is what you were missing) ----
  function showPage(id) {
    // show/hide sections
    qsa(".page-section").forEach((p) => p.classList.add("hidden"));
    qs(`#${id}`)?.classList.remove("hidden");

    // active state
    qsa(".nav-item").forEach((a) => {
      a.classList.toggle("active", a.dataset.page === id);
    });

    // load content per page
    if (id === "dashboard") loadDashboard();
    if (id === "students") loadStudents();
    if (id === "submitted") loadHomework();
  }

  // hook nav items
  qsa(".nav-item").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const page = a.dataset.page;
      if (!page) return;
      showPage(page);
      closeSidebar(); // mobile convenience
    });
  });

  // Hook up create buttons
  qs("#addCourseBtn")?.addEventListener("click", openCourseModal);
  qs("#addHomeworkBtn")?.addEventListener("click", openHomeworkModal);

  // Setup notifications
  setupNotificationsUI();
  loadNotifications();
  setInterval(loadNotifications, 15000);

  // initial load
  showPage("dashboard");
});

//load courses
async function loadMyCourses() {
  const container = qs("#myCoursesContainer");
  if (!container) return;

  const courses = await fetchJSON("/courses"); 

  container.innerHTML = courses
    .map(
      (c) => `
    <article class="bg-white rounded-2xl border border-[#A5C8A1]/60 p-4 shadow-sm flex justify-between items-start">
      <div>
        <h4 class="font-semibold">${esc(c.title)}</h4>
        <p class="text-sm opacity-80">${esc(c.description || "")}</p>
        <div class="text-xs opacity-60 mt-1">Type: ${esc(c.locationType || "in-person")}</div>
        ${
          c.pdfUrl
            ? `<a class="text-xs underline text-green-800" href="${esc(c.pdfUrl)}" target="_blank">PDF: ${esc(c.pdfName || "View")}</a>`
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
}

async function loadMyCourses() {
  const container = document.getElementById("myCoursesContainer");
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
        ${esc(c.locationType || "in-person")}
      </div>
    </div>
  `).join("");
}




