// teacher.js
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login-instructor.html";

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];

  const toast = (msg, color = "rgba(0,0,0,.75)") => {
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

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "M";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }

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
    if (localStorage.getItem("role") !== "instructor") return (location.href = LOGIN);

    qs("#y").textContent = new Date().getFullYear();

    setupThemeUI(true);
    setupProfileDropdown();
    renderTopbarIdentity();
    setupPersonalizeModal();
    setupMobileSidebar();
    setupNav();
    bindButtons();

    setupNotificationsUI();
    loadNotifications();
    setInterval(loadNotifications, 15000);

    await loadMeIntoUI();
    await loadDashboard();
  }

  function applyTheme(theme) {
    const t = theme || "light";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  }

  function setupThemeUI(forceDefaultLight = false) {
    const saved = localStorage.getItem("theme");
    if (forceDefaultLight && !saved) applyTheme("light");
    else applyTheme(saved || "light");

    qsa(".themePick").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        applyTheme(b.dataset.theme);
      });
    });
  }

  function logout() {
    localStorage.clear();
    location.href = LOGIN;
  }

  function renderTopbarIdentity() {
    const name = localStorage.getItem("userName") || "Manager";
    qs("#userName").textContent = name;

    const avatarEl = qs("#userAvatar");
    const avatarData = localStorage.getItem("userAvatar") || "";

    if (!avatarEl) return;

    if (avatarData) {
      avatarEl.style.backgroundImage = `url(${avatarData})`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.textContent = "";
    } else {
      avatarEl.style.backgroundImage = "";
      avatarEl.textContent = initials(name);
    }
  }

  function setupProfileDropdown() {
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
  }

  function openPersonalize() {
    qs("#personalizeBg")?.classList.remove("hidden");
    qs("#personalizeBg")?.classList.add("flex");
    document.body.style.overflow = "hidden";
    loadPersonalizeFields();
  }

  function closePersonalize() {
    qs("#personalizeBg")?.classList.add("hidden");
    qs("#personalizeBg")?.classList.remove("flex");
    document.body.style.overflow = "";
  }

  function loadPersonalizeFields() {
    const name = localStorage.getItem("userName") || "Manager";
    const avatarData = localStorage.getItem("userAvatar") || "";
    const email = localStorage.getItem("userEmail") || "";

    const nameInput = qs("#profileNameInput");
    const emailInput = qs("#profileEmailInput");
    const preview = qs("#profileAvatarPreview");

    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;

    if (preview) {
      if (avatarData) {
        preview.style.backgroundImage = `url(${avatarData})`;
        preview.style.backgroundSize = "cover";
        preview.style.backgroundPosition = "center";
        preview.textContent = "";
      } else {
        preview.style.backgroundImage = "";
        preview.textContent = initials(name);
      }
    }
  }

  function setupPersonalizeModal() {
    qs("#openPersonalize")?.addEventListener("click", (e) => {
      e.preventDefault();
      qs("#profileMenu")?.classList.add("hidden");
      openPersonalize();
    });

    qs("#closePersonalize")?.addEventListener("click", closePersonalize);

    qs("#personalizeBg")?.addEventListener("click", (e) => {
      if (e.target === qs("#personalizeBg")) closePersonalize();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePersonalize();
    });

    qs("#profilePhotoInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        localStorage.setItem("userAvatar", ev.target.result);
        loadPersonalizeFields();
        renderTopbarIdentity();
      };
      reader.readAsDataURL(file);
    });

    qs("#removeAvatarBtn")?.addEventListener("click", () => {
      localStorage.removeItem("userAvatar");
      loadPersonalizeFields();
      renderTopbarIdentity();
    });

    qs("#savePersonalize")?.addEventListener("click", async () => {
      const newName = (qs("#profileNameInput")?.value || "").trim() || "Manager";
      const newEmail = (qs("#profileEmailInput")?.value || "").trim();

      localStorage.setItem("userName", newName);
      localStorage.setItem("userEmail", newEmail);

      try {
        const res = await fetch(`${API}/me`, {
          method: "PUT",
          headers: jsonHeaders(),
          body: JSON.stringify({ name: newName, email: newEmail }),
        });
        const out = await safeJson(res);
        if (!res.ok || !out?.success) {
          toast(out?.message || "Could not save email to server", "rgba(185,28,28,.85)");
        } else {
          toast("Saved", "rgba(34,197,94,.70)");
        }
      } catch {
        toast("Server error saving profile", "rgba(185,28,28,.85)");
      }

      renderTopbarIdentity();
      await loadMeIntoUI();
      closePersonalize();
    });
  }

  async function loadMeIntoUI() {
    const topEmail = qs("#topEmail");
    try {
      const res = await fetch(`${API}/me`, { headers: actorHeaders() });
      const out = await safeJson(res);
      const email = out?.user?.email || localStorage.getItem("userEmail") || "";
      if (email) localStorage.setItem("userEmail", email);
      if (topEmail) topEmail.textContent = email || "—";
    } catch {
      if (topEmail) topEmail.textContent = localStorage.getItem("userEmail") || "—";
    }
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
        if (page === "students") await loadStudents();
        if (page === "submitted-homework") await loadHomework();
        if (page === "submitted-courses") await loadCourses();
        if (page === "users") await loadUsers();
        if (page === "news") await loadNews();
      });
    });
  }

  function bindButtons() {
    qs("#openCreateHw")?.addEventListener("click", openCreateHomeworkModal);
    qs("#openCreateCourse")?.addEventListener("click", openCreateCourseModal);
    qs("#refreshUsersBtn")?.addEventListener("click", loadUsers);
    qs("#createUserBtn")?.addEventListener("click", openCreateUserModal);
    qs("#createNewsBtn")?.addEventListener("click", openCreateNewsModal);
  }

 function showModal(html) {
  closeModal();

  const bg = document.createElement("div");
  bg.id = "modalBg";
  bg.className =
    "fixed inset-0 bg-black/45 flex items-start justify-center z-50 backdrop-blur-sm overflow-y-auto p-6";

  bg.innerHTML = `
    <div class="surface-2 p-6 w-[92%] max-w-lg max-h-[90vh] overflow-y-auto rounded-[18px]">
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
    if (!username || !["manager", "instructor", "student"].includes(role)) return;

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
      <div class="px-4 py-3 border-b border-white/10 ${n.unread ? "bg-white/10" : ""}">
        <div class="text-sm font-extrabold">${esc(n.message || "")}</div>
        <div class="text-xs muted mt-1">
          ${esc(n.byName || n.byUsername || "Someone")} · ${esc(n.byRole || "")} ·
          ${new Date(n.ts).toLocaleString()}
        </div>
      </div>
    `
      )
      .join("");
  }

  async function loadDashboard() {
    const [courses, hw] = await Promise.all([fetchJSON("/courses"), fetchJSON("/homework")]);

    qs("#activeCoursesCount").textContent = courses.length;
    qs("#toGradeCount").textContent = hw.length;

    const box = qs("#courses");
    if (!box) return;

    box.innerHTML = courses
      .map(
        (c) => `
      <div class="surface-2 p-4 rounded-[18px] flex justify-between items-center">
        <div>
          <div class="font-extrabold">${esc(c.title)}</div>
          <div class="text-sm muted">${esc(c.description || "")}</div>
          <div class="text-xs muted mt-1">Type: ${esc(c.locationType || "in-person")}</div>
          ${
            c.pdfUrl
              ? `<a class="text-xs underline" href="${esc(c.pdfUrl)}" target="_blank">PDF: ${esc(c.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="edit-course icon-btn" data-id="${c.id}" title="Edit">✏️</button>
          <button class="del-course icon-btn" data-id="${c.id}" title="Delete">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    box.querySelectorAll(".del-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;
        const r = await fetch(`${API}/courses/${id}`, { method: "DELETE", headers: actorHeaders() });
        if (!r.ok) return toast("Delete failed", "rgba(185,28,28,.85)");
        toast("Deleted", "rgba(185,28,28,.85)");
        loadDashboard();
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

  async function loadCourses() {
    const courses = await fetchJSON("/courses");
    const list = qs("#submitted-courses-list");
    if (!list) return;

    list.innerHTML = courses
      .map(
        (c) => `
      <div class="surface-2 p-4 rounded-[18px] mb-3 flex justify-between items-center">
        <div>
          <div class="font-extrabold">${esc(c.title)}</div>
          <div class="text-sm muted">${esc(c.description || "")}</div>
          <div class="text-xs muted mt-1">Type: ${esc(c.locationType || "in-person")}</div>
          ${
            c.pdfUrl
              ? `<a class="text-xs underline" href="${esc(c.pdfUrl)}" target="_blank">PDF: ${esc(c.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="edit-course icon-btn" data-id="${c.id}" title="Edit">✏️</button>
          <button class="del-course icon-btn" data-id="${c.id}" title="Delete">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    list.querySelectorAll(".del-course").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete course?")) return;
        const r = await fetch(`${API}/courses/${id}`, { method: "DELETE", headers: actorHeaders() });
        if (!r.ok) return toast("Delete failed", "rgba(185,28,28,.85)");
        toast("Deleted", "rgba(185,28,28,.85)");
        loadCourses();
        loadDashboard();
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

  async function loadStudents() {
    const students = await fetchJSON("/students");
    const table = qs("#studentTable");
    if (!table) return;

    table.innerHTML = students
      .map(
        (s) => `
      <tr class="border-t border-white/10">
        <td class="px-6 py-3 font-bold">${esc(s.name)}</td>
        <td class="px-6 py-3">${esc(s.course)}</td>
        <td class="px-6 py-3">${s.grade ?? "-"}</td>
        <td class="px-6 py-3 text-right muted">—</td>
      </tr>
    `
      )
      .join("");
  }

  async function loadHomework() {
    const hw = await fetchJSON("/homework");
    const list = qs("#homework-list");
    if (!list) return;

    list.innerHTML = hw
      .map(
        (h) => `
      <div class="surface-2 p-4 rounded-[18px] flex justify-between items-start">
        <div>
          <div class="font-extrabold">${esc(h.title)}</div>
          <div class="text-sm muted">${esc(h.description || "")}</div>
          <div class="text-xs muted mt-2">By: ${esc(h.submitted_by || "N/A")} · ${esc(h.course || "")}</div>
          ${
            h.pdfUrl
              ? `<a class="text-xs underline" href="${esc(h.pdfUrl)}" target="_blank">PDF: ${esc(h.pdfName || "View")}</a>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <button class="edit-hw icon-btn" data-id="${h.id}" title="Edit">✏️</button>
          <button class="del-hw icon-btn" data-id="${h.id}" title="Delete">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    list.querySelectorAll(".del-hw").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete homework?")) return;
        const r = await fetch(`${API}/homework/${id}`, { method: "DELETE", headers: actorHeaders() });
        if (!r.ok) return toast("Delete failed", "rgba(185,28,28,.85)");
        toast("Deleted", "rgba(185,28,28,.85)");
        loadHomework();
        loadDashboard();
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

  async function loadNews() {
    const list = qs("#newsList");
    if (!list) return;

    const res = await fetch(`${API}/news`);
    const out = await safeJson(res);
    const items = out?.items || [];

    if (!items.length) {
      list.innerHTML = `<div class="surface-2 p-4 rounded-[18px] text-sm muted">No news posted yet.</div>`;
      return;
    }

    list.innerHTML = items.map(n => `
      <div class="surface-2 p-4 rounded-[18px]">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="font-extrabold text-lg">${esc(n.title)}</div>
            ${n.summary ? `<div class="text-sm muted mt-1">${esc(n.summary)}</div>` : ""}
            ${n.content ? `<div class="text-sm mt-3 whitespace-pre-wrap">${esc(n.content)}</div>` : ""}
            <div class="text-xs muted mt-3">
              By ${esc(n.createdBy || "Manager")} · ${new Date(n.createdAt).toLocaleString()}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="edit-news icon-btn" data-id="${n.id}" title="Edit">✏️</button>
            <button class="del-news icon-btn" data-id="${n.id}" title="Delete">🗑</button>
          </div>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".edit-news").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const found = items.find(x => String(x.id) === String(id));
        if (found) openEditNewsModal(found);
      });
    });

    list.querySelectorAll(".del-news").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete this news item?")) return;

        const res = await fetch(`${API}/news/${id}`, {
          method: "DELETE",
          headers: actorHeaders()
        });

        const out = await safeJson(res);
        if (!res.ok || !out?.success) return toast(out?.message || "Delete failed", "rgba(185,28,28,.85)");

        toast("News deleted", "rgba(185,28,28,.85)");
        loadNews();
        loadNotifications();
      });
    });
  }

  function openCreateNewsModal() {
    showModal(`
      <h2 class="text-xl font-extrabold mb-4">Create News</h2>
      
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="btn-theme">Cancel</button>
        <button id="submitNews" class="btn-theme">Post</button>
      </div>
      
      <label class="text-sm font-bold muted">Title</label>
      <input id="newsTitle" class="input-theme mt-1 mb-3" placeholder="Title" />

      <label class="text-sm font-bold muted">Summary</label>
      <input id="newsSummary" class="input-theme mt-1 mb-3" placeholder="Short summary" />

      <label class="text-sm font-bold muted">Content</label>
      <textarea id="newsContent" class="input-theme mt-1 mb-4 min-h-[140px]" placeholder="Write the news content here..."></textarea>


    `);

    qs("#submitNews")?.addEventListener("click", async () => {
      const title = qs("#newsTitle")?.value.trim();
      const summary = qs("#newsSummary")?.value.trim();
      const content = qs("#newsContent")?.value.trim();

      if (!title) return toast("Title required", "rgba(185,28,28,.85)");

      const res = await fetch(`${API}/news`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, summary, content })
      });

      const out = await safeJson(res);
      if (!res.ok || !out?.success) return toast(out?.message || "Create failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("News posted", "rgba(34,197,94,.70)");
      loadNews();
      loadNotifications();
    });
  }

  function openEditNewsModal(item) {
    showModal(`
      <h2 class="text-xl font-extrabold mb-4">Edit News</h2>

      <label class="text-sm font-bold muted">Title</label>
      <input id="newsTitle" class="input-theme mt-1 mb-3" value="${esc(item.title)}" />

      <label class="text-sm font-bold muted">Summary</label>
      <input id="newsSummary" class="input-theme mt-1 mb-3" value="${esc(item.summary || "")}" />

      <label class="text-sm font-bold muted">Content</label>
      <textarea id="newsContent" class="input-theme mt-1 mb-4 min-h-[140px]">${esc(item.content || "")}</textarea>

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="btn-theme">X</button>
        <button id="saveNews" class="btn-theme">Save</button>
      </div>
    `);

    qs("#saveNews")?.addEventListener("click", async () => {
      const title = qs("#newsTitle")?.value.trim();
      const summary = qs("#newsSummary")?.value.trim();
      const content = qs("#newsContent")?.value.trim();

      if (!title) return toast("Title required", "rgba(185,28,28,.85)");

      const res = await fetch(`${API}/news/${item.id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, summary, content })
      });

      const out = await safeJson(res);
      if (!res.ok || !out?.success) return toast(out?.message || "Update failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("News updated", "rgba(34,197,94,.70)");
      loadNews();
      loadNotifications();
    });
  }

  async function uploadPdf(file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
    const out = await safeJson(res);
    if (!res.ok || !out?.success) throw new Error(out?.message || "Upload failed");
    return out;
  }

  function openCreateCourseModal() {

  showModal(`

    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-extrabold">Create Course</h2>
      <button id="cancelModal" class="btn-theme text-sm">Cancel</button>
    </div>

    <form id="courseForm">

      <label class="text-sm font-bold muted">Title</label>
      <input id="courseTitle" class="input-theme mt-1 mb-3" required />

      <label class="text-sm font-bold muted">Description</label>
      <textarea id="courseDescription" class="input-theme mt-1 mb-3"></textarea>

      <label class="text-sm font-bold muted">Cover</label>
      <input id="courseCover" type="file" accept="image/*" class="mb-3"/>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-sm font-bold muted">Duration</label>
          <input id="courseDurationValue" class="input-theme mt-1" placeholder="12">
        </div>

        <div>
          <label class="text-sm font-bold muted">Unit</label>
          <select id="courseDurationUnit" class="select-theme mt-1">
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-sm font-bold muted">Sessions</label>
          <input id="courseSessionsValue" class="input-theme mt-1" placeholder="8">
        </div>

        <div>
          <label class="text-sm font-bold muted">Unit</label>
          <select id="courseSessionsUnit" class="select-theme mt-1">
            <option value="lessons">Lessons</option>
            <option value="classes">Classes</option>
            <option value="meetings">Meetings</option>
          </select>
        </div>
      </div>

      <label class="text-sm font-bold muted">Program Type</label>
      <input id="courseProgramType" class="input-theme mt-1 mb-3">

      <label class="text-sm font-bold muted">Theme</label>
      <input id="courseTheme" class="input-theme mt-1 mb-3">

      <label class="text-sm font-bold muted">Offer</label>
      <input id="courseOffer" class="input-theme mt-1 mb-3">

      <label class="text-sm font-bold muted">Start Date</label>
      <input id="courseStartDate" type="date" class="input-theme mt-4 mb-4">

      <div class="flex justify-end gap-3 mt-4">

        <button type="button" id="saveDraftBtn" class="btn-theme">
          Save Draft
        </button>

        <button type="button" id="publishCourseBtn" class="btn-theme">
          Publish
        </button>

      </div>

    </form>
  `);

  setupCourseForm();
}

let forceDraft = false;

function setupCourseForm() {

  const form = qs("#courseForm");
  const username = localStorage.getItem("username");
  const profilePic = localStorage.getItem("userAvatar") || "";

  qs("#saveDraftBtn")?.addEventListener("click", () => {
    forceDraft = true;
    form.requestSubmit();
  });

  qs("#publishCourseBtn")?.addEventListener("click", () => {
    forceDraft = false;
    form.requestSubmit();
  });

  form?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const file = qs("#courseCover")?.files?.[0];
    const cover = file ? await toBase64(file) : "";

    const finalStatus = forceDraft ? "draft" : "published";
    const finalStatus = forceDraft ? "draft" : selectedStatus;

    const newCourse = {

      title: qs("#courseTitle")?.value.trim(),
      description: qs("#courseDescription")?.value.trim(),
      cover,

      durationValue: qs("#courseDurationValue")?.value,
      durationUnit: qs("#courseDurationUnit")?.value,

      sessionsValue: qs("#courseSessionsValue")?.value,
      sessionsUnit: qs("#courseSessionsUnit")?.value,

      programType: qs("#courseProgramType")?.value,
      theme: qs("#courseTheme")?.value,
      offer: qs("#courseOffer")?.value,

      startDate: qs("#courseStartDate")?.value || null,

      status: finalStatus,

      createdByUsername: username,
      createdByAvatar: profilePic
    };

    closeModal();
    forceDraft = false;

    try {

      const res = await fetch(`${API}/courses`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(newCourse)
      });

      if (!res.ok) throw new Error("Create failed");

      toast("Course created", "rgba(34,197,94,.7)");

      loadCourses();
      loadDashboard();
      loadNotifications();

    } catch (err) {
      console.error(err);
      toast("Failed to create course", "rgba(185,28,28,.85)");
    }

  });

}

  
  function openEditCourseModal(course) {
    showModal(`
      <h2 class="text-xl font-extrabold mb-4">Edit Course</h2>
      <label class="text-sm font-bold muted">Title</label>
      <input id="courseTitle" class="input-theme mt-1 mb-3" value="${esc(course.title)}" />
      <label class="text-sm font-bold muted">Description</label>
      <textarea id="courseDesc" class="input-theme mt-1 mb-3">${esc(course.description || "")}</textarea>
      <label class="text-sm font-bold muted">Type</label>
      <select id="courseType" class="select-theme mt-1 mb-3">
        <option value="in-person" ${course.locationType === "in-person" ? "selected" : ""}>In-person</option>
        <option value="online" ${course.locationType === "online" ? "selected" : ""}>Online</option>
        <option value="hybrid" ${course.locationType === "hybrid" ? "selected" : ""}>Hybrid</option>
      </select>
      <div class="text-xs muted mb-2">${course.pdfUrl ? `Current PDF: ${esc(course.pdfName || "Attached")}` : "No PDF attached"}</div>
      <input id="coursePdf" type="file" accept=".pdf" class="mt-1 mb-4 w-full text-sm" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="btn-theme">Cancel</button>
        <button id="saveCourse" class="btn-theme">Save</button>
      </div>
    `);

    qs("#saveCourse").addEventListener("click", async () => {
      const title = qs("#courseTitle").value.trim();
      const description = qs("#courseDesc").value.trim();
      const locationType = qs("#courseType").value;

      if (!title) return toast("Title required", "rgba(185,28,28,.85)");

      let pdfUrl = course.pdfUrl || "", pdfName = course.pdfName || "";
      const file = qs("#coursePdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url; pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "rgba(185,28,28,.85)");
      }

      const res = await fetch(`${API}/courses/${encodeURIComponent(course.id)}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, locationType, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Update failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("Course updated", "rgba(34,197,94,.70)");
      loadCourses();
      loadDashboard();
      loadNotifications();
    });
  }

  function openCreateHomeworkModal() {
    showModal(`
      <h2 class="text-xl font-extrabold mb-4">Create Homework</h2>
      <label class="text-sm font-bold muted">Title</label>
      <input id="hwTitle" class="input-theme mt-1 mb-3" placeholder="Title" />
      <label class="text-sm font-bold muted">Description</label>
      <textarea id="hwDesc" class="input-theme mt-1 mb-3" placeholder="Description"></textarea>
      <label class="text-sm font-bold muted">Course</label>
      <input id="hwCourse" class="input-theme mt-1 mb-3" placeholder="Course name" />
      <label class="text-sm font-bold muted">PDF (optional)</label>
      <input id="hwPdf" type="file" accept=".pdf" class="mt-2 mb-4 w-full text-sm" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="btn-theme">Cancel</button>
        <button id="submitHw" class="btn-theme">Create</button>
      </div>
    `);

    qs("#submitHw").addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      if (!title || !course) return toast("Title + course required", "rgba(185,28,28,.85)");

      let pdfUrl = "", pdfName = "";
      const file = qs("#hwPdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url; pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "rgba(185,28,28,.85)");
      }

      const res = await fetch(`${API}/homework`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, course, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Create homework failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("Homework created", "rgba(34,197,94,.70)");
      loadHomework();
      loadDashboard();
      loadNotifications();
    });
  }

  function openEditHomeworkModal(hw) {
    showModal(`
      <h2 class="text-xl font-extrabold mb-4">Edit Homework</h2>
      <label class="text-sm font-bold muted">Title</label>
      <input id="hwTitle" class="input-theme mt-1 mb-3" value="${esc(hw.title)}" />
      <label class="text-sm font-bold muted">Description</label>
      <textarea id="hwDesc" class="input-theme mt-1 mb-3">${esc(hw.description || "")}</textarea>
      <label class="text-sm font-bold muted">Course</label>
      <input id="hwCourse" class="input-theme mt-1 mb-3" value="${esc(hw.course || "")}" />
      <div class="text-xs muted mb-2">${hw.pdfUrl ? `Current PDF: ${esc(hw.pdfName || "Attached")}` : "No PDF attached"}</div>
      <input id="hwPdf" type="file" accept=".pdf" class="mt-1 mb-4 w-full text-sm" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="btn-theme">Cancel</button>
        <button id="saveHw" class="btn-theme">Save</button>
      </div>
    `);

    qs("#saveHw").addEventListener("click", async () => {
      const title = qs("#hwTitle").value.trim();
      const description = qs("#hwDesc").value.trim();
      const course = qs("#hwCourse").value.trim();
      if (!title || !course) return toast("Title + course required", "rgba(185,28,28,.85)");

      let pdfUrl = hw.pdfUrl || "", pdfName = hw.pdfName || "";
      const file = qs("#hwPdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url; pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "rgba(185,28,28,.85)");
      }

      const res = await fetch(`${API}/homework/${encodeURIComponent(hw.id)}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, course, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Update failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("Homework updated", "rgba(34,197,94,.70)");
      loadHomework();
      loadDashboard();
      loadNotifications();
    });
  }

  function openCreateUserModal() {
    showModal(`
      <h2 class="text-xl font-extrabold mb-4">Create User</h2>
      <label class="text-sm font-bold muted">Username</label>
      <input id="uUsername" class="input-theme mt-1 mb-3" placeholder="Username" />
      <label class="text-sm font-bold muted">Full name</label>
      <input id="uName" class="input-theme mt-1 mb-3" placeholder="Full name" />
      <label class="text-sm font-bold muted">Gmail</label>
      <input id="uEmail" class="input-theme mt-1 mb-3" placeholder="name@gmail.com" />
      <label class="text-sm font-bold muted">Password</label>
      <input id="uPassword" type="password" class="input-theme mt-1 mb-3" placeholder="Password" />
      <label class="text-sm font-bold muted">Role</label>
      <select id="uRole" class="select-theme mt-1 mb-4">
        <option value="student">student</option>
        <option value="instructor">instructor</option>
        <option value="manager">manager</option>
      </select>
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="btn-theme">Cancel</button>
        <button id="submitUser" class="btn-theme">Create</button>
      </div>
    `);

    qs("#submitUser").addEventListener("click", async () => {
      const username = qs("#uUsername").value.trim();
      const name = qs("#uName").value.trim() || username;
      const email = qs("#uEmail").value.trim();
      const password = qs("#uPassword").value.trim();
      const role = qs("#uRole").value;

      if (!username || !password) return toast("Username + password required", "rgba(185,28,28,.85)");

      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ username, password, role, name, email }),
      });

      const out = await safeJson(res);
      if (!res.ok || !out?.success) return toast(out?.message || "Create failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("User created", "rgba(34,197,94,.70)");
      loadUsers();
      loadNotifications();
    });
  }

  async function loadUsers() {
    const table = qs("#usersTable");
    if (!table) return toast("Missing #usersTable", "rgba(185,28,28,.85)");

    const res = await fetch(`${API}/users`, { headers: actorHeaders() });

    if (res.status === 403) {
      table.innerHTML = "";
      return toast("Forbidden: missing manager role", "rgba(185,28,28,.85)");
    }

    const users = await safeJson(res);
    if (!Array.isArray(users)) {
      table.innerHTML = "";
      return toast("Failed to load users", "rgba(185,28,28,.85)");
    }

    table.innerHTML = users
      .map(
        (u) => `
      <tr class="border-t border-white/10">
        <td class="px-6 py-3 font-bold">${esc(u.username)}</td>
        <td class="px-6 py-3">${esc(u.name || "")}</td>
        <td class="px-6 py-3">${esc(u.role || "")}</td>
        <td class="px-6 py-3">${esc(u.email || "")}</td>
        <td class="px-6 py-3 text-right">
          <button class="del-user btn-theme px-3 py-2" data-username="${esc(u.username)}">Delete</button>
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
        if (!del.ok || !out?.success) return toast(out?.message || "Delete failed", "rgba(185,28,28,.85)");

        toast("User deleted", "rgba(185,28,28,.85)");
        loadUsers();
        loadNotifications();
      });
    });
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

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
})();
