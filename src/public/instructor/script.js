document.addEventListener("DOMContentLoaded", () => {
  // ✅ Use ONE login URL (must match your real file location in /public)
  const LOGIN_URL = "/homepage/login.html";

  // ✅ Only these routes/pages are protected
  const PROTECTED_PREFIXES = ["/instructor", "/manager", "/students"];

  const path = window.location.pathname;

  // ✅ Detect login page safely
  const isLoginPage =
    path === "/homepage/login.html" ||
    path.endsWith("/homepage/login.html") ||
    path.endsWith("/login.html");

  // ✅ Check if we are currently in a protected area
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  // ✅ If protected and not logged in -> go login (NO LOOPS)
  if (isProtected && !localStorage.getItem("isLoggedIn")) {
    // prevent ping-pong
    if (!isLoginPage) window.location.replace(LOGIN_URL);
    return;
  }

  // ======= BASIC ELEMENTS =======
  const yearSpan = document.getElementById("y");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const overlay = document.getElementById("overlay");
  const menuLinks = document.querySelectorAll("nav a");
  const pages = document.querySelectorAll(".page-section");

  // ======= SIDEBAR TOGGLE =======
  menuBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("-translate-x-full");
    overlay?.classList.toggle("hidden");
  });

  overlay?.addEventListener("click", () => {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  });

  // ======= NAVIGATION =======
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
    const target = document.getElementById(id);
    if (target) target.classList.remove("hidden");

    if (id === "dashboard") loadDashboard();
    if (id === "students") loadStudents();
    if (id === "submitted") loadHomework();
  }

  // ======= TOAST =======
  function showToast(message, color = "#1C1820") {
    const toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg fade-in z-[9999]";
    toast.style.backgroundColor = color;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ======= MODALS =======
  function showModal(innerHTML) {
    closeModal(); // prevent stacked modals

    const modalBg = document.createElement("div");
    modalBg.id = "modalBg";
    modalBg.className =
      "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50";
    modalBg.innerHTML = `
      <div class="bg-white rounded-2xl p-6 shadow-lg w-[90%] max-w-md fade-in">
        ${innerHTML}
      </div>
    `;
    document.body.appendChild(modalBg);

    document.getElementById("cancelModal")?.addEventListener("click", closeModal);

    modalBg.addEventListener("click", (e) => {
      if (e.target === modalBg) closeModal();
    });
  }

  function closeModal() {
    document.getElementById("modalBg")?.remove();
  }

  // ======= API BASE =======
  // ✅ For same domain deployments, leave it empty.
  const API_BASE = "";

  // ======= DASHBOARD =======
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

  async function loadDashboard() {
    try {
      const [coursesRes, hwRes] = await Promise.all([
        fetch(`${API_BASE}/api/courses`),
        fetch(`${API_BASE}/api/homework`),
      ]);

      const courses = await coursesRes.json();
      const homework = await hwRes.json();

      animateCount("activeCoursesCount", Array.isArray(courses) ? courses.length : 0);
      animateCount("toGradeCount", Array.isArray(homework) ? homework.length : 0);

      const container = document.getElementById("courses");
      if (!container) return;

      container.innerHTML = (courses || [])
        .map(
          (c) => `
          <article class="bg-white rounded-2xl border border-[#B6AEA4]/40 p-4 shadow-sm flex justify-between items-center">
            <div>
              <h4 class="font-semibold text-[#1C1820]">${c.title}</h4>
              <p class="text-sm text-[#3E3B59]">${c.description || ""}</p>
            </div>
            <button data-id="${c.id}" class="deleteCourseBtn text-sm px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition">🗑</button>
          </article>`
        )
        .join("");

      document.querySelectorAll(".deleteCourseBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this course?")) return;

          await fetch(`${API_BASE}/api/courses/${btn.dataset.id}`, { method: "DELETE" });
          showToast("Course deleted", "#b91c1c");
          loadDashboard();
        });
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      showToast("Dashboard load failed", "#b91c1c");
    }
  }

  // ======= STUDENTS =======
  async function loadStudents() {
    try {
      const res = await fetch(`${API_BASE}/api/students`);
      const data = await res.json();
      const table = document.getElementById("studentTable");
      if (!table) return;

      table.innerHTML = (data || [])
        .map(
          (s) => `
        <tr>
          <td class="px-6 py-4 font-medium">${s.name}</td>
          <td class="px-6 py-4">${s.course}</td>
          <td class="px-6 py-4">${s.grade ?? "-"}</td>
          <td class="px-6 py-4 text-right">
            <button data-id="${s.enrollment_id}" data-grade="${s.grade}" class="editBtn text-sm px-3 py-1.5 border border-[#B6AEA4] rounded-lg hover:bg-[#B6AEA4]/40">✏️</button>
          </td>
        </tr>`
        )
        .join("");

      document.querySelectorAll(".editBtn").forEach((btn) =>
        btn.addEventListener("click", () =>
          openEditGradeModal(btn.dataset.id, btn.dataset.grade)
        )
      );
    } catch (err) {
      console.error("Students load error:", err);
      showToast("Students load failed", "#b91c1c");
    }
  }

  // ======= HOMEWORK =======
  async function loadHomework() {
    try {
      const res = await fetch(`${API_BASE}/api/homework`);
      const hw = await res.json();

      const list = document.getElementById("homework-list");
      if (!list) return;

      list.innerHTML = (hw || [])
        .map(
          (h) => `
        <div class="bg-white border border-[#B6AEA4]/40 p-4 rounded-xl shadow-sm relative text-left">
          <h3 class="font-semibold text-[#1C1820]">${h.title}</h3>
          <p class="text-sm text-[#3E3B59]">${h.description || ""}</p>
          <p class="text-xs text-[#3E3B59]/70 mt-2">Submitted by ${h.submitted_by || "N/A"} · ${h.course || ""}</p>
          <button data-id="${h.id}" class="deleteHomeworkBtn absolute top-3 right-3 text-rose-500 hover:text-rose-700">🗑</button>
        </div>`
        )
        .join("");

      document.querySelectorAll(".deleteHomeworkBtn").forEach((btn) =>
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this homework?")) return;

          await fetch(`${API_BASE}/api/homework/${btn.dataset.id}`, { method: "DELETE" });
          showToast("Homework deleted", "#b91c1c");
          loadHomework();
          loadDashboard();
        })
      );
    } catch (err) {
      console.error("Homework load error:", err);
      showToast("Homework load failed", "#b91c1c");
    }
  }

  // ======= CREATE COURSE MODAL =======
  function openCourseModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create Course</h2>
      <input id="courseTitle" type="text" placeholder="Course title" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="courseDesc" placeholder="Description" class="w-full border rounded-lg px-3 py-2 mb-4"></textarea>
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg hover:bg-[#3E3B59]">Create</button>
      </div>
    `);

    document.getElementById("submitModal")?.addEventListener("click", async () => {
      const title = document.getElementById("courseTitle").value.trim();
      const description = document.getElementById("courseDesc").value.trim();

      if (!title) return showToast("Title required!", "#b91c1c");

      await fetch(`${API_BASE}/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      closeModal();
      showToast("Course created!", "#166534");
      loadDashboard();
    });
  }

  // ======= CREATE HOMEWORK MODAL =======
  function openHomeworkModal() {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Create Homework</h2>
      <input id="hwTitle" type="text" placeholder="Homework title" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <textarea id="hwDesc" placeholder="Description" class="w-full border rounded-lg px-3 py-2 mb-3"></textarea>
      <input id="hwCourse" type="number" placeholder="Course ID" class="w-full border rounded-lg px-3 py-2 mb-3" />
      <input id="hwBy" type="text" placeholder="Submitted by" class="w-full border rounded-lg px-3 py-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg hover:bg-[#3E3B59]">Submit</button>
      </div>
    `);

    document.getElementById("submitModal")?.addEventListener("click", async () => {
      const course_id = Number(document.getElementById("hwCourse").value);
      const title = document.getElementById("hwTitle").value.trim();
      const description = document.getElementById("hwDesc").value.trim();
      const submitted_by = document.getElementById("hwBy").value.trim();

      if (!title || !course_id) return showToast("Title + Course ID required", "#b91c1c");

      await fetch(`${API_BASE}/api/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id, title, description, submitted_by }),
      });

      closeModal();
      showToast("Homework created!", "#166534");
      loadHomework();
      loadDashboard();
    });
  }

  // ======= EDIT GRADE MODAL =======
  function openEditGradeModal(id, grade) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Grade</h2>
      <input id="gradeInput" type="number" min="1" max="10" value="${grade ?? ""}" class="w-full border rounded-lg px-3 py-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg hover:bg-[#3E3B59]">Save</button>
      </div>
    `);

    document.getElementById("submitModal")?.addEventListener("click", async () => {
      const newGrade = Number(document.getElementById("gradeInput").value);
      if (isNaN(newGrade) || newGrade < 1 || newGrade > 10)
        return showToast("Grade must be 1–10", "#b91c1c");

      await fetch(`${API_BASE}/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: newGrade }),
      });

      closeModal();
      showToast("Grade updated!", "#166534");
      loadStudents();
    });
  }

  // ✅ Hook up the CREATE buttons from your HTML
  document.getElementById("addCourseBtn")?.addEventListener("click", openCourseModal);
  document.getElementById("addHomeworkBtn")?.addEventListener("click", openHomeworkModal);

  // ======= USER / LOGOUT (VISIBLE) =======
  const userName = document.getElementById("userName");
  const userAvatar = document.getElementById("userAvatar");

  if (userName) userName.textContent = localStorage.getItem("userName") || "User";
  if (userAvatar) {
    userAvatar.style.backgroundImage = "url('https://i.pravatar.cc/40')";
    userAvatar.style.backgroundSize = "cover";
  }

  // ✅ Add a logout button next to avatar (so it can’t “disappear”)
  const headerRight = userAvatar?.parentElement;
  if (headerRight && !document.getElementById("logoutBtn")) {
    const logoutBtn = document.createElement("button");
    logoutBtn.id = "logoutBtn";
    logoutBtn.textContent = "Logout";
    logoutBtn.className = "ml-3 text-sm px-3 py-1 rounded-lg bg-[var(--text-dark)] text-[var(--soft-green)] hover:opacity-90";
    headerRight.appendChild(logoutBtn);

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");
      window.location.replace(LOGIN_URL);
    });
  }

  // ======= DEFAULT PAGE =======
  showPage("dashboard");
});
