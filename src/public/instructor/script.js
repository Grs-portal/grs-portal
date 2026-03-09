document.addEventListener("DOMContentLoaded", () => {

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

const mainSidebar = qs("#mainSidebar");
const coursesSidebar = qs("#coursesSidebar");
const overlay = qs("#overlay");
const menuBtn = qs("#menuBtn");

/* =====================================================
AUTH
===================================================== */

const LOGIN_URL = "/homepage/login.html";
const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");
const profilePic = localStorage.getItem("profilePic");

if (!isLoggedIn || role !== "instructor") {
  window.location.replace(LOGIN_URL);
  return;
}

/* =====================================================
SIDEBAR CONTROL
===================================================== */

const closeAllSidebars = () => {
  mainSidebar?.classList.remove("active");
  coursesSidebar?.classList.remove("active");
  overlay?.classList.remove("active");
};

const openMainSidebar = () => {
  coursesSidebar?.classList.remove("active");
  mainSidebar?.classList.add("active");
  if (window.innerWidth < 1024) overlay?.classList.add("active");
};

const openCoursesSidebar = () => {
  mainSidebar?.classList.remove("active");
  coursesSidebar?.classList.add("active");
  if (window.innerWidth < 1024) overlay?.classList.add("active");
};

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    if (mainSidebar?.classList.contains("active")) closeAllSidebars();
    else openMainSidebar();
  });
}

overlay?.addEventListener("click", closeAllSidebars);

/* =====================================================
ROUTER
===================================================== */

const showPage = (id) => {

  qsa(".page-section").forEach(p => p.classList.add("hidden"));

  const page = qs("#" + id);
  if (page) page.classList.remove("hidden");

  qsa(".nav-item").forEach(a => {
    a.classList.toggle("active", a.dataset.page === id);
  });

  if (id === "my-courses") {
    openCoursesSidebar();
    Courses.init();
    return;
  }

  if (id === "course-detail") {
    closeAllSidebars();
    return;
  }

  openMainSidebar();
};

/* =====================================================
COURSES SIDEBAR
===================================================== */

const buildCoursesSidebar = () => {

if (!coursesSidebar) return;

coursesSidebar.innerHTML = `
<div class="courses-sidebar-content h-full overflow-y-auto">

<button id="backDashboardBtn" class="nav-item bg-black/90 text-white rounded-xl justify-center mb-2">
☰ Dashboard
</button>

<h3 class="sidebar-title">Filter Programs</h3>

<div class="filter-group">
<label>Search</label>
<input id="searchCourse" type="text" placeholder="Search programs..." />
</div>

<button id="newCourseBtn" class="new-course-btn">
+ New Course
</button>

<div class="filter-group">
<label>Status</label>
<select id="statusFilter">
<option value="">All</option>
<option value="draft">Draft</option>
<option value="not-started">Upcoming</option>
<option value="ongoing">Ongoing</option>
<option value="finished">Completed</option>
</select>
</div>

<div class="filter-group">
<label>Program Type</label>
<select id="typeFilter">
<option value="">All</option>
<option value="course">Courses</option>
<option value="workshops">Workshops</option>
<option value="activities">Activities</option>
</select>
</div>

<div class="filter-group">
<label>Theme</label>
<select id="themeFilter">
<option value="">All</option>
<option value="rest">Rest & Relaxation</option>
<option value="recovery">Recovery & Balance</option>
<option value="insight">Self-insight</option>
<option value="connection">Connection</option>
</select>
</div>

<div class="filter-group mt-4">
<label>Calendar</label>
<input type="date" id="calendarFilter"/>
</div>

</div>
`;

qs("#newCourseBtn")?.addEventListener("click", () => Courses.openModal());
qs("#backDashboardBtn")?.addEventListener("click", () => showPage("dashboard"));

const searchInput = qs("#searchCourse");
const statusFilter = qs("#statusFilter");
const typeFilter = qs("#typeFilter");

const applyFilters = () => {

Courses.render({
search: searchInput?.value || "",
status: statusFilter?.value || "",
type: typeFilter?.value || ""
});

};

typeFilter?.addEventListener("change", applyFilters);
searchInput?.addEventListener("input", applyFilters);
statusFilter?.addEventListener("change", applyFilters);

};

/* =====================================================
COURSE DETAIL
===================================================== */

const openCourseDetail = async (id) => {

closeAllSidebars();
showPage("course-detail");

const res = await fetch("/api/courses");
const allCourses = await res.json();
const course = allCourses.find(c => c.id == id);

if (!course) return;

const container = qs("#courseDetailContainer");

container.innerHTML = `
<div class="course-detail-wrapper">

<div class="course-detail-header">

<button id="backToCourses" class="btn-primary">
← Back
</button>

<div class="relative">

<button id="courseMenuBtn" class="text-2xl px-3 py-1 rounded-xl hover:bg-black/10">
⋮
</button>

<div id="courseMenu" class="course-menu hidden glass rounded-xl p-2 flex flex-col gap-1">

<button id="editProgramBtn" class="px-3 py-2 text-left hover:bg-black/10 rounded-lg">
Edit Program
</button>

<button id="deleteProgramBtn" class="px-3 py-2 text-left hover:bg-red-100 text-red-600 rounded-lg">
Delete Program
</button>

</div>
</div>
</div>
</div>
`;

const menuBtn = qs("#courseMenuBtn");
const menu = qs("#courseMenu");

menuBtn?.addEventListener("click", () => {
menu.classList.toggle("hidden");
});

qs("#backToCourses")?.addEventListener("click", () => {
showPage("my-courses");
});

qs("#deleteProgramBtn")?.addEventListener("click", async () => {

const confirmName = prompt(
`Type the program name to delete:

"${course.title}"`
);

if (!confirmName) return;

if (confirmName !== course.title) {
alert("Program name does not match.");
return;
}

await fetch(`/api/courses/${course.id}`, { method: "DELETE" });

alert("Program deleted");

showPage("my-courses");
Courses.loadCourses();

});

};

/* ===================================================== */

qsa(".nav-item").forEach(link => {
link.addEventListener("click", e => {
e.preventDefault();
showPage(link.dataset.page);
});
});

buildCoursesSidebar();
showPage("dashboard");

});
