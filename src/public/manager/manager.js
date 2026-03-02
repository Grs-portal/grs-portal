// manager.js
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login.html";

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

    qs("#y").textContent = new Date().getFullYear();

    // Load profile persisted in data.json (fallback to localStorage)
    await hydrateProfile();

    setupThemeUI();
    setupProfileDropdown();
    setupPersonalizeModal();
    setupMobileSidebar();
    setupNav();
    bindButtons();

    setupNotificationsUI();
    loadNotifications();
    setInterval(loadNotifications, 15000);

    await loadDashboard();
  }

  // ---------------- PROFILE + THEME (PERSISTED) ----------------
  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "M";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase().slice(0, 2);
  }

  function applyTheme(theme) {
    const t = theme || localStorage.getItem("theme") || "light";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  }

  function setAvatarEl(el, displayName, avatarData) {
    if (!el) return;
    if (avatarData) {
      el.style.backgroundImage = `url(${avatarData})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.textContent = "";
    } else {
      el.style.backgroundImage = "";
      el.textContent = initials(displayName || "Manager");
    }
  }

  async function loadProfileFromServer() {
    const username = localStorage.getItem("username") || "";
    const role = localStorage.getItem("role") || "";
    if (!username || !role) return null;

    try {
      const res = await fetch(
        `${API}/profile?role=${encodeURIComponent(role)}&username=${encodeURIComponent(username)}`
      );
      const out = await safeJson(res);
      if (!out?.success) return null;
      return out.profile;
    } catch {
      return null;
    }
  }

  async function saveProfileToServer({ displayName, avatarData, theme }) {
    try {
      const res = await fetch(`${API}/profile`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ displayName, avatarData, theme }),
      });
      const out = await safeJson(res);
      return !!out?.success;
    } catch {
      return false;
    }
  }

  async function hydrateProfile() {
    // Defaults from login
    const baseName = localStorage.getItem("userName") || "Manager";

    // Server profile (preferred)
    const prof = await loadProfileFromServer();

    const displayName =
      prof?.displayName ||
      localStorage.getItem("displayName") ||
      baseName;

    const avatarData =
      prof?.avatarData ||
      localStorage.getItem("userAvatar") ||
      "";

    const theme =
      prof?.theme ||
      localStorage.getItem("theme") ||
      "glass";

    localStorage.setItem("displayName", displayName);
    localStorage.setItem("userAvatar", avatarData);
    localStorage.setItem("theme", theme);

    applyTheme(theme);

    qs("#userName").textContent = displayName;
    setAvatarEl(qs("#userAvatar"), displayName, avatarData);
  }

  // Theme buttons live in dropdown + modal (same class .themePick)
  function setupThemeUI() {
    // Ensure current theme applied
    applyTheme(localStorage.getItem("theme") || "glass");

    qsa(".themePick").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.preventDefault();
        const t = b.dataset.theme || "glass";
        applyTheme(t);

        // store + persist
        localStorage.setItem("theme", t);
        await saveProfileToServer({
          displayName: localStorage.getItem("displayName") || localStorage.getItem("userName") || "Manager",
          avatarData: localStorage.getItem("userAvatar") || "",
          theme: t,
        });

        toast(`Theme: ${t}`, "rgba(34,197,94,.70)");
      });
    });
  }

  function logout() {
    localStorage.clear();
    location.href = LOGIN;
  }

  function setupProfileDropdown() {
    const avatar = qs("#userAvatar");
    const menu = qs("#profileMenu");
    const wrap = qs("#topAvatarWrap");

    avatar?.addEventListener("click", (e) => {
      e.stopPropagation();
      menu?.classList.toggle("hidden");
    });

    qs("#logoutBtn")?.addEventListener("click", logout);
    qs("#sidebarLogout")?.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });

    document.addEventListener("click", (e) => {
      if (wrap && !wrap.contains(e.target)) menu?.classList.add("hidden");
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") menu?.classList.add("hidden");
    });
  }

  // ---------------- PERSONALIZE MODAL ----------------
  function setupPersonalizeModal() {
    const openBtn = qs("#openPersonalize");
    const bg = qs("#personalizeBg");
    const closeBtn = qs("#closePersonalize");
    const saveBtn = qs("#savePersonalize");

    const nameInput = qs("#profileNameInput");
    const photoInput = qs("#profilePhotoInput");
    const removeBtn = qs("#removeAvatarBtn");
    const preview = qs("#profileAvatarPreview");

    function open() {
      qs("#profileMenu")?.classList.add("hidden");

      const displayName = localStorage.getItem("displayName") || localStorage.getItem("userName") || "Manager";
      const avatarData = localStorage.getItem("userAvatar") || "";

      if (nameInput) nameInput.value = displayName;

      if (preview) {
        if (avatarData) {
          preview.style.backgroundImage = `url(${avatarData})`;
          preview.style.backgroundSize = "cover";
          preview.style.backgroundPosition = "center";
          preview.textContent = "";
        } else {
          preview.style.backgroundImage = "";
          preview.textContent = initials(displayName);
        }
      }

      bg?.classList.remove("hidden");
      bg?.classList.add("flex");
      document.body.style.overflow = "hidden";
    }

    function close() {
      bg?.classList.add("hidden");
      bg?.classList.remove("flex");
      document.body.style.overflow = "";
    }

    openBtn?.addEventListener("click", (e) => { e.preventDefault(); open(); });
    closeBtn?.addEventListener("click", close);
    bg?.addEventListener("click", (e) => { if (e.target === bg) close(); });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    photoInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = String(ev.target.result || "");
        localStorage.setItem("userAvatar", data);

        // update preview + topbar live
        if (preview) {
          preview.style.backgroundImage = `url(${data})`;
          preview.style.backgroundSize = "cover";
          preview.style.backgroundPosition = "center";
          preview.textContent = "";
        }
        setAvatarEl(qs("#userAvatar"), localStorage.getItem("displayName") || "Manager", data);
      };
      reader.readAsDataURL(file);
    });

    removeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("userAvatar");
      if (photoInput) photoInput.value = "";

      const displayName = localStorage.getItem("displayName") || "Manager";
      if (preview) {
        preview.style.backgroundImage = "";
        preview.textContent = initials(displayName);
      }
      setAvatarEl(qs("#userAvatar"), displayName, "");
    });

    saveBtn?.addEventListener("click", async (e) => {
      e.preventDefault();

      const baseName = localStorage.getItem("userName") || "Manager";
      const displayName = (nameInput?.value || "").trim() || baseName;
      const avatarData = localStorage.getItem("userAvatar") || "";
      const theme = localStorage.getItem("theme") || "glass";

      localStorage.setItem("displayName", displayName);

      // update topbar immediately
      qs("#userName").textContent = displayName;
      setAvatarEl(qs("#userAvatar"), displayName, avatarData);

      // persist in data.json
      const ok = await saveProfileToServer({ displayName, avatarData, theme });
      if (ok) toast("Saved personalization", "rgba(34,197,94,.70)");
      else toast("Saved locally (server failed)", "rgba(251,191,36,.90)");

      close();
    });
  }

  // ---------------- SIDEBAR MOBILE ----------------
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

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
        qs("#notifMenu")?.classList.add("hidden");
        qs("#profileMenu")?.classList.add("hidden");
      }
    });
  }

  // ---------------- NAV ----------------
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
      });
    });
  }

  function bindButtons() {
    qs("#openCreateHw")?.addEventListener("click", openCreateHomeworkModal);
    qs("#openCreateCourse")?.addEventListener("click", openCreateCourseModal);

    qs("#refreshUsersBtn")?.addEventListener("click", loadUsers);
    qs("#createUserBtn")?.addEventListener("click", openCreateUserModal);
  }

  // ---------------- MODAL ----------------
  function showModal(html) {
    closeModal();
    const bg = document.createElement("div");
    bg.id = "modalBg";
    bg.className = "fixed inset-0 bg-black/45 flex items-center justify-center z-50 backdrop-blur-sm";
    bg.innerHTML = `
      <div class="surface-2 p-6 w-[92%] max-w-md">
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

  // ---------------- DASHBOARD ----------------
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

  // ---------------- COURSES PAGE ----------------
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

  // ---------------- STUDENTS ----------------
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

  // ---------------- HOMEWORK ----------------
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

  // ---------------- UPLOAD HELPER ----------------
  async function uploadPdf(file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
    const out = await safeJson(res);
    if (!res.ok || !out?.success) throw new Error(out?.message || "Upload failed");
    return out; // {url, originalName}
  }

  // ---------------- CREATE/EDIT MODALS ----------------
  function openCreateCourseModal() {
    showModal(`
      <h2 class="text-xl font-extrabold mb-4">Create Course</h2>

      <label class="text-sm font-bold muted">Title</label>
      <input id="courseTitle" class="input-theme mt-1 mb-3" placeholder="Title" />

      <label class="text-sm font-bold muted">Description</label>
      <textarea id="courseDesc" class="input-theme mt-1 mb-3" placeholder="Description"></textarea>

      <label class="text-sm font-bold muted">Type</label>
      <select id="courseType" class="select-theme mt-1 mb-3">
        <option value="in-person">In-person</option>
        <option value="online">Online</option>
        <option value="hybrid">Hybrid</option>
      </select>

      <label class="text-sm font-bold muted">PDF (optional)</label>
      <input id="coursePdf" type="file" accept=".pdf" class="mt-2 mb-4 w-full text-sm" />

      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="btn-theme">Cancel</button>
        <button id="submitCourse" class="btn-theme">Create</button>
      </div>
    `);

    qs("#submitCourse").addEventListener("click", async () => {
      const title = qs("#courseTitle").value.trim();
      const description = qs("#courseDesc").value.trim();
      const locationType = qs("#courseType").value;

      if (!title) return toast("Title required", "rgba(185,28,28,.85)");

      let pdfUrl = "", pdfName = "";
      const file = qs("#coursePdf")?.files?.[0];
      try {
        if (file) {
          const up = await uploadPdf(file);
          pdfUrl = up.url; pdfName = up.originalName;
        }
      } catch (e) {
        return toast(e.message, "rgba(185,28,28,.85)");
      }

      const res = await fetch(`${API}/courses`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title, description, locationType, pdfUrl, pdfName }),
      });

      if (!res.ok) return toast("Create course failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("Course created", "rgba(34,197,94,.70)");
      loadCourses();
      loadDashboard();
      loadNotifications();
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

      <div class="text-xs muted mb-2">
        ${course.pdfUrl ? `Current PDF: ${esc(course.pdfName || "Attached")}` : "No PDF attached"}
      </div>
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

      <div class="text-xs muted mb-2">
        ${hw.pdfUrl ? `Current PDF: ${esc(hw.pdfName || "Attached")}` : "No PDF attached"}
      </div>
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
      const password = qs("#uPassword").value.trim();
      const role = qs("#uRole").value;

      if (!username || !password) return toast("Username + password required", "rgba(185,28,28,.85)");

      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ username, password, role, name }),
      });

      const out = await safeJson(res);
      if (!res.ok || !out?.success) return toast(out?.message || "Create failed", "rgba(185,28,28,.85)");

      closeModal();
      toast("User created", "rgba(34,197,94,.70)");
      loadUsers();
      loadNotifications();
    });
  }

  // ---------------- USERS ----------------
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

