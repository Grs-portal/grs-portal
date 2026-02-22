// /instructor/script.js
document.addEventListener("DOMContentLoaded", () => {
  const LOGIN_URL = "/homepage/login.html";
  const API = "/api";

  // ---- Auth guard ----
  const path = window.location.pathname;
  const isLoginPage = path.endsWith("login.html");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  if (!isLoginPage && (!isLoggedIn || role !== "instructor")) {
    window.location.replace(LOGIN_URL);
    return;
  }

  // ---- Helpers ----
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];
  const esc = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const toast = (msg, color = "#1C1820") => {
    const t = document.createElement("div");
    t.className =
      "fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg z-[9999]";
    t.style.background = color;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  // ---- Topbar ----
  if (qs("#y")) qs("#y").textContent = new Date().getFullYear();
  const displayName = localStorage.getItem("userName") || "Instructor";
  if (qs("#userName")) qs("#userName").textContent = displayName;
  const avatar = qs("#userAvatar");
  if (avatar) avatar.textContent = (displayName.trim()[0] || "I").toUpperCase();

  // ---- Sidebar toggle (mobile) ----
  const sidebar = qs("#sidebar");
  const overlay = qs("#overlay");

  function openSidebar() {
    sidebar?.classList.remove("-translate-x-full");
    overlay?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
    document.body.style.overflow = "";
  }

  qs("#menuBtn")?.addEventListener("click", () => {
    sidebar?.classList.contains("-translate-x-full") ? openSidebar() : closeSidebar();
  });
  overlay?.addEventListener("click", closeSidebar);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });

  // ---- Navigation ----
  qsa(".nav-item").forEach((link) =>
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(link.dataset.page);
      closeSidebar();
    })
  );

  // ---- Logout ----
  function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    window.location.replace(LOGIN_URL);
  }
  qs("#logoutBtn")?.addEventListener("click", logout);
  qs("#sidebarLogout")?.addEventListener("click", logout);

  // ---- Profile dropdown ----
  const topAvatarWrap = qs("#topAvatarWrap");
  const profileMenu = qs("#profileMenu");

  avatar?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu?.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (topAvatarWrap && profileMenu && !topAvatarWrap.contains(e.target)) {
      profileMenu.classList.add("hidden");
    }
  });

  // ---- Modals ----
  function closeModal() {
    document.getElementById("modalBg")?.remove();
  }

  function showModal(innerHTML) {
    closeModal();
    const modalBg = document.createElement("div");
    modalBg.id = "modalBg";
    modalBg.className =
      "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50";
    modalBg.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-lg w-[92%] max-w-md">${innerHTML}</div>`;
    document.body.appendChild(modalBg);

    modalBg.addEventListener("click", (e) => {
      if (e.target === modalBg) closeModal();
    });

    document.getElementById("cancelModal")?.addEventListener("click", closeModal);
  }

  // ---- Notifications ----
  function setupNotificationsUI() {
    const btn = qs("#notifBtn");
    const menu = qs("#notifMenu");
    const wrap = qs("#notifWrap");

    btn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      menu?.classList.toggle("hidden");
      if (menu && !menu.classList.contains("hidden")) await loadNotifications();
    });

    document.addEventListener("click", (e) => {
      if (!wrap || !menu) return;
      if (!wrap.contains(e.target)) menu.classList.add("hidden");
    });

    qs("#notifReadAll")?.addEventListener("click", async (e) => {
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
    if (!username) return;

    const res = await fetch(
      `${API}/notifications?role=${encodeURIComponent(
        role
      )}&username=${encodeURIComponent(username)}`
    );
    const data = await res.json().catch(() => null);
    if (!data?.success) return;

    const items = data.items || [];
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
        (n) => `<div class="px-4 py-3 border-b border-black/5 ${
          n.unread ? "bg-green-50" : ""
        }">
          <div class="text-sm font-bold">${esc(n.message)}</div>
          <div class="text-xs opacity-70 mt-1">
            ${esc(n.byName || n.byUsername || "Someone")} · ${esc(
          n.byRole || ""
        )} · ${new Date(n.ts).toLocaleString()}
          </div>
        </div>`
      )
      .join("");
  }

  // ---- Demo Course Card ----
  async function loadDashboard() {
    const container = qs("#courses");
    if (!container) return;

    container.innerHTML = "";

    // demo card
    const demoCard = document.createElement("div");
    demoCard.className =
      "glass p-4 rounded-2xl cursor-pointer hover:shadow-lg transition";
    demoCard.innerHTML = `
      <img src="https://via.placeholder.com/400x180.png?text=Demo+Course" class="rounded-xl w-full">
      <h4 class="text-lg title-strong mt-2">Demo Course</h4>
      <p class="text-xs subtitle mt-1">This is a sample course.</p>
    `;
    demoCard.addEventListener("click", () => {
      window.location.href = "/instructor/course.html?id=demo";
    });

    container.appendChild(demoCard);
  }

  // ---- Page Router ----
  function showPage(id) {
    qsa(".page-section").forEach((p) => p.classList.add("hidden"));
    qs(`#${id}`)?.classList.remove("hidden");

    qsa(".nav-item").forEach((a) =>
      a.classList.toggle("active", a.dataset.page === id)
    );

    if (id === "dashboard") loadDashboard();
  }

  setupNotificationsUI();
  loadNotifications();
  setInterval(loadNotifications, 15000);

  showPage("dashboard");
});
