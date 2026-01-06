document.addEventListener("DOMContentLoaded", () => {
  const LOGIN_PATH = "/homepage/login.html";

  // ---- Auth guard (prevents redirect loops) ----
  const isLoginPage = window.location.pathname.endsWith("login.html");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  if (!isLoginPage && (!isLoggedIn || role !== "student")) {
    // not logged in or wrong role -> kick to login
    window.location.href = LOGIN_PATH;
    return;
  }

  // ---- UI: name + avatar ----
  const userNameEl = document.getElementById("userName");
  const avatarEl = document.getElementById("userAvatar");
  const logoutBtn = document.getElementById("logoutBtn");

  const name = localStorage.getItem("userName") || "Student";
  if (userNameEl) userNameEl.textContent = name;

  if (avatarEl) {
    avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=E5E7EB&color=111827`;
  }

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    window.location.href = LOGIN_PATH;
  });

  // ---- Elements ----
  const coursesGrid = document.getElementById("coursesGrid");
  const homeworkList = document.getElementById("homeworkList");
  const activeCoursesCount = document.getElementById("activeCoursesCount");
  const homeworkCount = document.getElementById("homeworkCount");
  const refreshBtn = document.getElementById("refreshBtn");

  refreshBtn?.addEventListener("click", loadAll);

  // ---- Helpers ----
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function courseCard(c) {
    const title = escapeHtml(c.title);
    const desc = escapeHtml(c.description || "");
    return `
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 class="font-semibold text-gray-900 leading-tight">${title}</h4>
        <p class="text-sm text-gray-600 mt-1">${desc}</p>

        <div class="mt-3 w-full bg-gray-200 rounded-full h-3">
          <div class="h-3 rounded-full bg-indigo-600" style="width: 0%"></div>
        </div>
        <p class="text-sm text-gray-600 mt-2">0% Complete</p>

        <button
          class="mt-4 w-full bg-gray-100 hover:bg-green-500/60 text-black font-medium py-2 rounded-xl transition-colors duration-200">
          Continue
        </button>
      </div>
    `;
  }

  function homeworkCard(h) {
    const title = escapeHtml(h.title);
    const desc = escapeHtml(h.description || "");
    const by = escapeHtml(h.submitted_by || "N/A");
    const course = escapeHtml(h.course || h.course_title || "N/A");

    return `
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 class="font-semibold text-gray-900 leading-tight">${title}</h4>
        <p class="text-sm text-gray-600 mt-1">${desc}</p>
        <p class="text-xs text-gray-500 mt-3">Course: ${course} · By: ${by}</p>

        <button class="mt-4 w-full bg-gray-100 hover:bg-green-500/60 text-black font-medium py-2 rounded-xl transition">
          View
        </button>
      </div>
    `;
  }

  async function loadAll() {
    try {
      // same API used by instructor/manager
      const [coursesRes, hwRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/homework"),
      ]);

      const courses = await coursesRes.json();
      const hw = await hwRes.json();

      // counts
      if (activeCoursesCount) activeCoursesCount.textContent = courses.length;
      if (homeworkCount) homeworkCount.textContent = hw.length;

      // render courses
      if (coursesGrid) {
        coursesGrid.innerHTML =
          courses.length > 0
            ? courses.map(courseCard).join("")
            : `<p class="text-sm text-gray-500">No courses yet.</p>`;
      }

      // render homework
      if (homeworkList) {
        homeworkList.innerHTML =
          hw.length > 0
            ? hw.map(homeworkCard).join("")
            : `<p class="text-sm text-gray-500">No homework yet.</p>`;
      }
    } catch (err) {
      console.error("Student load error:", err);
      if (coursesGrid) {
        coursesGrid.innerHTML =
          `<p class="text-sm text-red-600">Failed to load courses/homework. Check server console.</p>`;
      }
    }
  }

  // initial load
  loadAll();
});
