document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://www.greenrecoveryspace.com";
  const LOGIN_PATH = "/homepage/login.html";

  // ===== AUTH CHECK =====
  const isLoginPage = window.location.pathname.endsWith("login.html");
  if (!isLoginPage && !localStorage.getItem("isLoggedIn")) {
    window.location.href = LOGIN_PATH;
    return;
  }

  // ===== ELEMENTS =====
  const yearSpan = document.getElementById("y");
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const overlay = document.getElementById("overlay");
  const menuLinks = document.querySelectorAll("nav a");
  const pages = document.querySelectorAll(".page-section");

  yearSpan.textContent = new Date().getFullYear();

  // ===== SIDEBAR =====
  menuBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  });

  overlay?.addEventListener("click", () => {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  });

  // ===== NAVIGATION =====
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pageId = link.dataset.page;
      showPage(pageId);

      menuLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
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

  // ===== COUNTER =====
  function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let count = 0;
    const step = Math.max(1, target / 30);
    const interval = setInterval(() => {
      count += step;
      if (count >= target) {
        count = target;
        clearInterval(interval);
      }
      el.textContent = Math.floor(count);
    }, 20);
  }

  // ===== TOAST =====
  function showToast(message, color = "#1C1820") {
    const toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg fade-in";
    toast.style.backgroundColor = color;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ===== DASHBOARD =====
  async function loadDashboard() {
    try {
      const [coursesRes, hwRes] = await Promise.all([
        fetch(`${API_BASE}/api/courses`),
        fetch(`${API_BASE}/api/homework`),
      ]);

      const courses = await coursesRes.json();
      const homework = await hwRes.json();

      animateCount("activeCoursesCount", courses.length);
      animateCount("toGradeCount", homework.length);

      const container = document.getElementById("courses");
      container.innerHTML = courses
        .map(
          (c) => `
        <article class="bg-white rounded-2xl border p-4 shadow-sm flex justify-between items-center">
          <div>
            <h4 class="font-semibold">${c.title}</h4>
            <p class="text-sm opacity-70">${c.description || ""}</p>
          </div>
          <button data-id="${c.id}" class="deleteCourseBtn text-sm px-3 py-1 bg-red-100 text-red-700 rounded">🗑</button>
        </article>`
        )
        .join("");

      document.querySelectorAll(".deleteCourseBtn").forEach((btn) => {
        btn.onclick = async () => {
          if (!confirm("Delete this course?")) return;
          await fetch(`${API_BASE}/api/courses/${btn.dataset.id}`, { method: "DELETE" });
          showToast("Course deleted", "#b91c1c");
          loadDashboard();
        };
      });
    } catch (err) {
      console.error(err);
    }
  }

  // ===== STUDENTS =====
  async function loadStudents() {
    const res = await fetch(`${API_BASE}/api/students`);
    const data = await res.json();
    const table = document.getElementById("studentTable");

    table.innerHTML = data
      .map(
        (s) => `
      <tr>
        <td class="px-6 py-4">${s.name}</td>
        <td class="px-6 py-4">${s.course}</td>
        <td class="px-6 py-4">${s.grade ?? "-"}</td>
        <td class="px-6 py-4 text-right">
          <button data-id="${s.enrollment_id}" data-grade="${s.grade}" class="editBtn">✏️</button>
        </td>
      </tr>`
      )
      .join("");

    document.querySelectorAll(".editBtn").forEach((btn) =>
      btn.onclick = () => openEditGradeModal(btn.dataset.id, btn.dataset.grade)
    );
  }

  // ===== HOMEWORK =====
  async function loadHomework() {
    const res = await fetch(`${API_BASE}/api/homework`);
    const hw = await res.json();

    document.getElementById("homework-list").innerHTML = hw
      .map(
        (h) => `
      <div class="bg-white p-4 rounded-xl relative">
        <h3 class="font-semibold">${h.title}</h3>
        <p class="text-sm opacity-70">${h.description || ""}</p>
        <button data-id="${h.id}" class="deleteHomeworkBtn absolute top-3 right-3">🗑</button>
      </div>`
      )
      .join("");

    document.querySelectorAll(".deleteHomeworkBtn").forEach((btn) => {
      btn.onclick = async () => {
        await fetch(`${API_BASE}/api/homework/${btn.dataset.id}`, { method: "DELETE" });
        showToast("Homework deleted", "#b91c1c");
        loadHomework();
        loadDashboard();
      };
    });
  }

  // ===== MODALS =====
  function showModal(html) {
    const bg = document.createElement("div");
    bg.id = "modalBg";
    bg.className = "fixed inset-0 bg-black/40 flex items-center justify-center z-50";
    bg.innerHTML = `<div class="bg-white rounded-2xl p-6 w-[90%] max-w-md">${html}</div>`;
    document.body.appendChild(bg);
    document.getElementById("cancelModal").onclick = closeModal;
    bg.onclick = (e) => e.target === bg && closeModal();
  }

  function closeModal() {
    document.getElementById("modalBg")?.remove();
  }

  function openCourseModal() {
    showModal(`
      <h2 class="text-xl mb-4">Create Course</h2>
      <input id="courseTitle" placeholder="Title" class="w-full border p-2 mb-3"/>
      <textarea id="courseDesc" placeholder="Description" class="w-full border p-2 mb-4"></textarea>
      <div class="flex justify-end gap-2">
        <button id="cancelModal">Cancel</button>
        <button id="submitModal">Create</button>
      </div>
    `);

    document.getElementById("submitModal").onclick = async () => {
      const title = courseTitle.value.trim();
      if (!title) return showToast("Title required", "#b91c1c");
      await fetch(`${API_BASE}/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: courseDesc.value }),
      });
      closeModal();
      loadDashboard();
    };
  }

  function openHomeworkModal() {
    showModal(`
      <h2 class="text-xl mb-4">Create Homework</h2>
      <input id="hwTitle" placeholder="Title" class="w-full border p-2 mb-3"/>
      <input id="hwCourse" placeholder="Course ID" class="w-full border p-2 mb-4"/>
      <div class="flex justify-end gap-2">
        <button id="cancelModal">Cancel</button>
        <button id="submitModal">Create</button>
      </div>
    `);

    document.getElementById("submitModal").onclick = async () => {
      await fetch(`${API_BASE}/api/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: hwTitle.value,
          course_id: hwCourse.value,
        }),
      });
      closeModal();
      loadHomework();
      loadDashboard();
    };
  }

  // ===== BUTTON HOOKS =====
  document.getElementById("addCourseBtn")?.addEventListener("click", openCourseModal);
  document.getElementById("addHomeworkBtn")?.addEventListener("click", openHomeworkModal);

  // ===== DEFAULT =====
  showPage("dashboard");
});
