document.addEventListener("DOMContentLoaded", () => {
  // ----- AUTH GUARD (prevents redirect loops) -----
  const LOGIN_PATH = "/homepage/login.html";
  const role = localStorage.getItem("role");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    window.location.href = LOGIN_PATH;
    return;
  }

  // If a non-student tries to open student pages, send them to their portal
  if (role !== "student") {
    const go =
      role === "instructor" ? "/instructor/" : role === "manager" ? "/manager/" : LOGIN_PATH;
    window.location.href = go;
    return;
  }

  // ----- LOGOUT (works even if button is missing; you can add it later) -----
  const logoutBtn = document.getElementById("logoutBtn") || document.getElementById("logoutBtn2");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");
      window.location.href = LOGIN_PATH;
    });
  }

  // ----- Show user name if you have an element -----
  const userNameEl = document.getElementById("userName");
  if (userNameEl) userNameEl.textContent = localStorage.getItem("userName") || "Student";

  // ----- LOAD + RENDER COURSES -----
  async function loadCourses() {
    const container =
      document.getElementById("coursesList") ||
      document.getElementById("courses") ||
      document.getElementById("myCourses");

    if (!container) return;

    const res = await fetch("/api/courses");
    const courses = await res.json();

    container.innerHTML = courses
      .map(
        (c) => `
        <div class="bg-white border border-black/10 rounded-xl p-4 shadow-sm">
          <h3 class="font-semibold">${c.title}</h3>
          <p class="text-sm opacity-80">${c.description || ""}</p>
        </div>
      `
      )
      .join("");
  }

  // ----- LOAD + RENDER HOMEWORK -----
  async function loadHomework() {
    const container =
      document.getElementById("homeworkList") ||
      document.getElementById("homework-list") ||
      document.getElementById("assignments");

    if (!container) return;

    const res = await fetch("/api/homework");
    const hw = await res.json();

    container.innerHTML = hw
      .map(
        (h) => `
        <div class="bg-white border border-black/10 rounded-xl p-4 shadow-sm">
          <h3 class="font-semibold">${h.title}</h3>
          <p class="text-sm opacity-80">${h.description || ""}</p>
          <p class="text-xs opacity-60 mt-2">
            Course: ${h.course || h.course_id || "N/A"} • Submitted by: ${h.submitted_by || "N/A"}
          </p>
        </div>
      `
      )
      .join("");
  }

  // Load everything on page load
  loadCourses();
  loadHomework();
});

