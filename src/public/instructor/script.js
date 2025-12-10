const API_BASE = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("isLoggedIn")) {
    window.location.href = "/login.html";
    return;
  }

  const yearSpan = document.getElementById("y");
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const overlay = document.getElementById("overlay");
  const menuLinks = document.querySelectorAll("nav a");
  const pages = document.querySelectorAll(".page-section");

  yearSpan.textContent = new Date().getFullYear();

  // ======== Sidebar toggle ========
  menuBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  });
  overlay?.addEventListener("click", () => {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  });

  // ======== Navigation ========
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pageId = link.dataset.page;
      showPage(pageId);
      menuLinks.forEach((l) =>
        l.classList.remove("bg-[#1C1820]", "text-[#F2F0E5]")
      );
      link.classList.add("bg-[#1C1820]", "text-[#F2F0E5]");
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
    });
  });

  function showPage(id) {
    pages.forEach((p) => p.classList.add("hidden"));
    const target = document.getElementById(id);
    if (target) target.classList.remove("hidden");

    switch (id) {
      case "dashboard":
        loadDashboard();
        break;
      case "students":
        loadStudents();
        break;
      case "submitted":
        loadHomework();
        break;
    }
  }

  // ======== Animated Counter ========
  function animateCount(id, target) {
    const el = document.getElementById(id);
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

  // ======== Toast Notifications ========
  function showToast(message, color = "#1C1820") {
    const toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg fade-in";
    toast.style.backgroundColor = color;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ======== Activity Log ========
  const activitySection = document.createElement("section");
  activitySection.innerHTML = `
    <div class="bg-[#F2F0E5] rounded-2xl shadow-md p-5 border border-[#B6AEA4]/30 fade-in mt-6">
      <h3 class="text-lg font-semibold text-[#1C1820] mb-3">Recent Activity</h3>
      <ul id="activityList" class="text-sm text-[#3E3B59] space-y-1"></ul>
    </div>`;
  document.getElementById("dashboard").appendChild(activitySection);

  function logActivity(action) {
    const list = document.getElementById("activityList");
    const item = document.createElement("li");
    item.textContent = `${new Date().toLocaleTimeString()} — ${action}`;
    list.prepend(item);
  }

  // ======== Loaders ========
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
          if (confirm("Delete this course?")) {
            await fetch(`${API_BASE}/api/courses/${btn.dataset.id}`, {
              method: "DELETE",
            });
            logActivity("Deleted a course");
            showToast("Course deleted", "#b91c1c");
            loadDashboard();
          }
        });
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  }

  async function loadStudents() {
    try {
      const res = await fetch(`${API_BASE}/api/students`);
      const data = await res.json();
      const table = document.getElementById("studentTable");

      // Search bar
      let search = document.getElementById("studentSearch");
      if (!search) {
        const input = document.createElement("input");
        input.id = "studentSearch";
        input.placeholder = "Search students...";
        input.className =
          "mb-3 w-full px-3 py-2 rounded-lg border border-[#B6AEA4]/40 bg-[#F2F0E5] text-[#1C1820]";
        table.parentElement.parentElement.prepend(input);
        search = input;
        input.addEventListener("input", (e) => {
          const term = e.target.value.toLowerCase();
          document
            .querySelectorAll("#studentTable tr")
            .forEach(
              (row) =>
                (row.style.display = row.textContent
                  .toLowerCase()
                  .includes(term)
                  ? ""
                  : "none")
            );
        });
      }

      table.innerHTML = data
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

      document.querySelectorAll(".editBtn").forEach((btn) => {
        btn.addEventListener("click", () =>
          openEditGradeModal(btn.dataset.id, btn.dataset.grade)
        );
      });
    } catch (err) {
      console.error("Students load error:", err);
    }
  }

  async function loadHomework() {
    try {
      const res = await fetch(`${API_BASE}/api/homework`);
      const hw = await res.json();
      const list = document.getElementById("homework-list");

      list.innerHTML = hw
        .map(
          (h) => `
        <div class="bg-white border border-[#B6AEA4]/40 p-4 rounded-xl shadow-sm relative text-left">
          <h3 class="font-semibold text-[#1C1820]">${h.title}</h3>
          <p class="text-sm text-[#3E3B59]">${h.description || ""}</p>
          <p class="text-xs text-[#3E3B59]/70 mt-2">Submitted by ${
            h.submitted_by || "N/A"
          } · ${h.course}</p>
          <button data-id="${h.id}" class="deleteHomeworkBtn absolute top-3 right-3 text-rose-500 hover:text-rose-700">🗑</button>
        </div>`
        )
        .join("");

      document.querySelectorAll(".deleteHomeworkBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (confirm("Delete this homework?")) {
            await fetch(`${API_BASE}/api/homework/${btn.dataset.id}`, {
              method: "DELETE",
            });
            logActivity("Deleted homework");
            showToast("Homework deleted", "#b91c1c");
            loadHomework();
            loadDashboard();
          }
        });
      });
    } catch (err) {
      console.error("Homework load error:", err);
    }
  }

  // ======== Modals ========
  document.getElementById("addCourseBtn")?.addEventListener("click", () => openCourseModal());
  document.getElementById("addHomeworkBtn")?.addEventListener("click", () => openHomeworkModal());

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
    document.getElementById("submitModal").onclick = async () => {
      const title = document.getElementById("courseTitle").value.trim();
      const description = document.getElementById("courseDesc").value.trim();
      if (!title) return showToast("Title required!", "#b91c1c");
      await fetch(`${API_BASE}/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      closeModal();
      logActivity(`Created course: ${title}`);
      showToast("Course created successfully!", "#166534");
      loadDashboard();
    };
  }

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
    document.getElementById("submitModal").onclick = async () => {
      const course_id = document.getElementById("hwCourse").value.trim();
      const title = document.getElementById("hwTitle").value.trim();
      const description = document.getElementById("hwDesc").value.trim();
      const submitted_by = document.getElementById("hwBy").value.trim();
      if (!title || !course_id) return showToast("Please fill all fields", "#b91c1c");
      await fetch(`${API_BASE}/api/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id, title, description, submitted_by }),
      });
      closeModal();
      logActivity(`Created homework: ${title}`);
      showToast("Homework created!", "#166534");
      loadHomework();
      loadDashboard();
    };
  }

  function openEditGradeModal(id, grade) {
    showModal(`
      <h2 class="text-xl font-semibold mb-4">Edit Grade</h2>
      <input id="gradeInput" type="number" min="1" max="10" value="${grade || ""}" class="w-full border rounded-lg px-3 py-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="cancelModal" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button id="submitModal" class="px-4 py-2 bg-[#1C1820] text-[#F2F0E5] rounded-lg hover:bg-[#3E3B59]">Save</button>
      </div>
    `);
    document.getElementById("submitModal").onclick = async () => {
      const newGrade = Number(document.getElementById("gradeInput").value);
      if (isNaN(newGrade) || newGrade < 1 || newGrade > 10)
        return showToast("Grade must be between 1–10!", "#b91c1c");
      await fetch(`${API_BASE}/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: newGrade }),
      });
      closeModal();
      logActivity(`Updated grade to ${newGrade}`);
      showToast("Grade updated!", "#166534");
      loadStudents();
    };
  }

  function showModal(innerHTML) {
    const modalBg = document.createElement("div");
    modalBg.id = "modalBg";
    modalBg.className =
      "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50";
    modalBg.innerHTML = `
      <div class="bg-white rounded-2xl p-6 shadow-lg w-[90%] max-w-md fade-in">${innerHTML}</div>
    `;
    document.body.appendChild(modalBg);
    document.getElementById("cancelModal").onclick = closeModal;
    modalBg.addEventListener("click", (e) => {
      if (e.target === modalBg) closeModal();
    });
  }

  function closeModal() {
    document.getElementById("modalBg")?.remove();
  }

 // ======== Profile dropdown ========
const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const name = localStorage.getItem("userName") || "Teacher";
userName.textContent = name;
userAvatar.style.backgroundImage = "url('https://i.pravatar.cc/40')";
userAvatar.style.backgroundSize = "cover";

// Dropdown
const dropdown = document.createElement("div");
dropdown.id = "profileMenu";
dropdown.className =
  "absolute right-4 top-14 bg-[#3E3B59] text-[#F2F0E5] rounded-lg shadow-lg hidden";
dropdown.innerHTML = `
  <button id="viewProfile" class="block w-full text-left px-4 py-2 hover:bg-[#4E4A69]">View Profile</button>
  <button id="logoutBtn2" class="block w-full text-left px-4 py-2 hover:bg-[#4E4A69]">Logout</button>
`;
document.body.appendChild(dropdown);

// Toggle dropdown
userAvatar.addEventListener("click", () => dropdown.classList.toggle("hidden"));

// Logout functionality
document.getElementById("logoutBtn2").onclick = logout;

function logout() {
  localStorage.removeItem("isLoggedIn");
  window.location.href = "/login.html";  // done finally
}





  // ======== Theme toggle ========
  const themeBtn = document.createElement("button");
  themeBtn.id = "themeToggle";
  themeBtn.textContent = "🌗";
  themeBtn.className =
    "fixed bottom-4 right-4 bg-[#3E3B59] text-[#F2F0E5] p-3 rounded-full shadow-lg";
  document.body.appendChild(themeBtn);

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("light") ? "light" : "dark"
    );
  });
  if (localStorage.getItem("theme") === "light")
    document.body.classList.add("light");

  // ======== Default Page ========
  showPage("dashboard");
});






