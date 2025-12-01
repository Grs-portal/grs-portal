document.addEventListener("DOMContentLoaded", () => {
  loadCourses();
  loadStudents();
  loadHomework();
});

// ---------------- NAV ----------------
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const page = item.getAttribute("data-page");

    document.querySelectorAll(".page-section").forEach(p => p.classList.add("hidden"));
    document.getElementById(page).classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    item.classList.add("active");
  });
});

// ---------------- LOAD COURSES ----------------
async function loadCourses() {
  const res = await fetch("/api/courses");
  const data = await res.json();

  const container = document.getElementById("courses");
  container.innerHTML = "";

  data.forEach(c => {
    container.innerHTML += `
      <div class="content-box">
        <h3 class="font-semibold">${c.title}</h3>
        <p class="text-sm opacity-70">${c.description}</p>
      </div>
    `;
  });

  document.getElementById("activeCoursesCount").textContent = data.length;
}

// ---------------- LOAD STUDENTS ----------------
async function loadStudents() {
  const res = await fetch("/api/students");
  const data = await res.json();

  const table = document.getElementById("studentTable");
  table.innerHTML = "";

  data.forEach(s => {
    table.innerHTML += `
      <tr class="border-b border-gray-300">
        <td class="px-6 py-3">${s.name}</td>
        <td class="px-6 py-3">${s.course}</td>
        <td class="px-6 py-3">${s.grade}</td>
        <td class="px-6 py-3 text-right">
          <button onclick="editGrade(${s.enrollment_id})" class="btn-primary">Edit</button>
        </td>
      </tr>
    `;
  });
}

async function editGrade(id) {
  const newGrade = prompt("Enter new grade:");
  if (!newGrade) return;

  await fetch(`/api/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grade: newGrade })
  });

  loadStudents();
}

// ---------------- LOAD HOMEWORK ----------------
async function loadHomework() {
  const res = await fetch("/api/homework");
  const data = await res.json();

  document.getElementById("toGradeCount").textContent = data.length;

  const list = document.getElementById("homework-list");
  list.innerHTML = "";

  data.forEach(hw => {
    list.innerHTML += `
      <div class="content-box">
        <h3 class="font-semibold">${hw.title}</h3>
        <p>${hw.description}</p>
        <p class="text-sm opacity-60">Submitted by: ${hw.submitted_by}</p>
      </div>
    `;
  });
}
