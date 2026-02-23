document.addEventListener("DOMContentLoaded", () => {
  const LOGIN_URL = "/homepage/login.html";

  /* ==========================
     AUTH GUARD
  ========================== */
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");
  if (!isLoggedIn || role !== "instructor") {
    window.location.replace(LOGIN_URL);
    return;
  }

  /* ==========================
     ELEMENT HELPERS
  ========================== */
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];
  const uid = () => crypto.randomUUID();
  const esc = (s) => String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-xl z-50";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  /* ==========================
     SIDEBAR SYSTEM
  ========================== */
  const mainSidebar = qs("#mainSidebar");
  const coursesSidebar = qs("#coursesSidebar");
  const toggleBtn = qs("#sidebarToggle");

  function buildCoursesSidebar() {
    coursesSidebar.innerHTML = `
      <div class="p-4 space-y-4">
        <input placeholder="Search courses..." class="w-full border rounded px-3 py-2">
        <select class="w-full border rounded px-3 py-2">
          <option>All types</option>
          <option>Video</option>
          <option>Readable</option>
        </select>
        <select class="w-full border rounded px-3 py-2">
          <option>All locations</option>
          <option>Online</option>
          <option>In person</option>
          <option>Both</option>
        </select>
        <select class="w-full border rounded px-3 py-2">
          <option>All states</option>
          <option>Draft</option>
          <option>Published</option>
        </select>
        <button class="w-full bg-black text-white rounded px-3 py-2">+ New Course</button>
        <div class="mt-6 text-xs opacity-50">📅 mini calendar (demo)</div>
      </div>
    `;
  }

  function openCoursesSidebar() {
    mainSidebar.classList.remove("active");
    coursesSidebar.classList.add("active");
    toggleBtn.classList.remove("hidden");
  }

  function openMainSidebar() {
    coursesSidebar.classList.remove("active");
    mainSidebar.classList.add("active");
    toggleBtn.classList.add("hidden");
  }

  toggleBtn.addEventListener("click", openMainSidebar);
  qs('[data-page="my-courses"]').addEventListener("click", (e) => {
    e.preventDefault();
    openCoursesSidebar();
    showPage("my-courses");
  });

  buildCoursesSidebar();

  /* ==========================
     ROUTER
  ========================== */
  function showPage(id) {
    qsa(".page-section").forEach(p => p.classList.add("hidden"));
    qs(`#${id}`)?.classList.remove("hidden");
    qsa(".nav-item").forEach(a => a.classList.toggle("active", a.dataset.page === id));
    if (id === "my-courses") Courses.init();
  }

  qsa(".nav-item").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  /* ==========================
     MODAL SYSTEM
  ========================== */
  function showModal(html) {
    closeModal();
    const bg = document.createElement("div");
    bg.id = "modalBg";
    bg.className = "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50";
    bg.innerHTML = `<div class="bg-white rounded-2xl p-6 w-[95%] max-w-lg fade-in">${html}</div>`;
    bg.addEventListener("click", (e) => e.target === bg && closeModal());
    document.body.appendChild(bg);
  }

  function closeModal() {
    qs("#modalBg")?.remove();
  }

  /* ==========================
     COURSES MODULE
  ========================== */
  const Courses = (() => {
    const KEY = "instructor_courses";
    let courses = JSON.parse(localStorage.getItem(KEY) || "[]");
    let activeId = null;

    const save = () => localStorage.setItem(KEY, JSON.stringify(courses));

    function init() {
      buildLayout();
      renderGrid();
    }

    function buildLayout() {
      const container = qs("#my-courses");
      container.innerHTML = `
        <div class="flex gap-6 fade-in">
          <aside class="w-72 glass rounded-2xl p-4 space-y-3">
            <input id="searchCourse" placeholder="Search..." class="w-full border rounded-xl px-3 py-2 text-sm">
            <select id="filterState" class="w-full border rounded-xl px-3 py-2 text-sm">
              <option value="">All states</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <button id="createCourseBtn" class="btn-primary w-full">+ New Course</button>
          </aside>
          <section id="coursesContent" class="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></section>
        </div>
      `;
      qs("#createCourseBtn").onclick = () => openEditor();
      qs("#searchCourse").oninput = renderGrid;
      qs("#filterState").onchange = renderGrid;
    }

    function renderGrid() {
      const content = qs("#coursesContent");
      let list = [...courses];
      const q = qs("#searchCourse").value.toLowerCase();
      const state = qs("#filterState").value;

      if (q) list = list.filter(c => c.title.toLowerCase().includes(q));
      if (state) list = list.filter(c => c.state === state);

      if (!list.length) {
        content.innerHTML = `
          <div class="col-span-full text-center glass rounded-2xl p-8">
            <p>No courses yet</p>
            <button class="btn-primary mt-3" id="emptyCreate">Create first course</button>
          </div>`;
        qs("#emptyCreate").onclick = () => openEditor();
        return;
      }

      content.innerHTML = "";
      list.forEach(c => {
        const card = document.createElement("div");
        card.className = "glass rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition";
        card.innerHTML = `
          <img src="${c.cover || 'https://picsum.photos/400'}" class="h-36 w-full object-cover">
          <div class="p-4 space-y-2">
            <div class="font-semibold">${esc(c.title)}</div>
            <div class="text-xs opacity-70 line-clamp-2">${esc(c.description)}</div>
            <div class="text-xs flex gap-3 opacity-80">
              <span>📍 ${c.location}</span>
              <span>⏱ ${c.duration}</span>
              <span class="px-2 py-0.5 bg-black/10 rounded">${c.state}</span>
            </div>
          </div>`;
        card.onclick = () => openDetail(c.id);
        content.appendChild(card);
      });
    }

    function openEditor(id = null) {
      const edit = courses.find(c => c.id === id);
      showModal(`
        <h3 class="text-lg font-semibold mb-4">${edit ? "Edit Course" : "New Course"}</h3>
        <form id="courseForm" class="space-y-3">
          <input id="title" required placeholder="Title" class="w-full border rounded-xl px-3 py-2" value="${edit?.title || ''}">
          <textarea id="desc" placeholder="Description" class="w-full border rounded-xl px-3 py-2">${edit?.description || ''}</textarea>
          <input id="cover" placeholder="Cover image URL" class="w-full border rounded-xl px-3 py-2" value="${edit?.cover || ''}">
          <input id="duration" placeholder="Duration" class="w-full border rounded-xl px-3 py-2" value="${edit?.duration || ''}">
          <select id="location" class="w-full border rounded-xl px-3 py-2">
            <option ${edit?.location === 'online'?'selected':''}>online</option>
            <option ${edit?.location === 'in person'?'selected':''}>in person</option>
            <option ${edit?.location === 'both'?'selected':''}>both</option>
          </select>
          <div class="flex gap-2">
            <button class="btn-primary flex-1">Save</button>
            <button type="button" id="cancelModal" class="border rounded-xl px-4">Cancel</button>
          </div>
        </form>
      `);
      qs("#cancelModal").onclick = closeModal;
      qs("#courseForm").onsubmit = e => {
        e.preventDefault();
        const data = {
          id: edit?.id || uid(),
          title: qs("#title").value,
          description: qs("#desc").value,
          cover: qs("#cover").value,
          duration: qs("#duration").value,
          location: qs("#location").value,
          state: edit?.state || "draft",
          chapters: edit?.chapters || [],
        };
        if (edit) courses = courses.map(c => c.id === id ? data : c);
        else courses.unshift(data);
        save();
        closeModal();
        renderGrid();
        toast("Saved");
      };
    }

    function openDetail(id) {
      activeId = id;
      const c = courses.find(x => x.id === id);
      const content = qs("#coursesContent");
      content.innerHTML = `
        <div class="col-span-full glass rounded-2xl p-6 space-y-4">
          <button id="backBtn" class="text-sm opacity-70">← Back</button>
          <img src="${c.cover}" class="w-full h-56 object-cover rounded-xl">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">${c.title}</h2>
            <div class="flex gap-2">
              <button id="editBtn" class="btn-primary">Edit</button>
              <button id="deleteBtn" class="border rounded-xl px-3">Delete</button>
            </div>
          </div>
          <p>${esc(c.description)}</p>
          <button id="addChap" class="btn-primary">+ Add Chapter</button>
          <div id="chapters" class="space-y-2"></div>
        </div>`;
      qs("#backBtn").onclick = renderGrid;
      qs("#editBtn").onclick = () => openEditor(id);
      qs("#deleteBtn").onclick = () => remove(id);
      qs("#addChap").onclick = addChapter;
      renderChapters();
    }

    function renderChapters() {
      const c = courses.find(x => x.id === activeId);
      const list = qs("#chapters");
      list.innerHTML = "";
      c.chapters.forEach((ch,i) => {
        const row = document.createElement("div");
        row.className = "glass rounded-xl p-3 flex justify-between text-sm";
        row.innerHTML = `<span>${i+1}. ${esc(ch.title)}</span><button>✕</button>`;
        row.querySelector("button").onclick = () => {
          c.chapters.splice(i,1);
          save();
          renderChapters();
        };
        list.appendChild(row);
      });
    }

    function addChapter() {
      const title = prompt("Chapter title:");
      if (!title) return;
      const c = courses.find(x => x.id === activeId);
      c.chapters.push({title});
      save();
      renderChapters();
    }

    function remove(id) {
      if (!confirm("Delete this course?")) return;
      courses = courses.filter(c => c.id !== id);
      save();
      renderGrid();
    }

    return { init };
  })();

  /* ==========================
     INIT
  ========================== */
  showPage("dashboard");
});
