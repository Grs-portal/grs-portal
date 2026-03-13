javascript
// teacher.js
(() => {
  const API = "/api";
  const LOGIN = "/homepage/login-teacher.html";

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

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "T";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }

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
    if (localStorage.getItem("role") !== "teacher") return (location.href = LOGIN);

    qs("#y").textContent = new Date().getFullYear();

    setupThemeUI(true);
    setupProfileDropdown();
    renderTopbarIdentity();
    setupPersonalizeModal();
    setupMobileSidebar();
    setupNav();
    bindButtons();

    setupNotificationsUI();
    loadNotifications();
    setInterval(loadNotifications, 15000);

    await loadMeIntoUI();
    await loadDashboard();
  }

  function applyTheme(theme) {
    const t = theme || "light";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  }

  function setupThemeUI(forceDefaultLight = false) {
    const saved = localStorage.getItem("theme");
    if (forceDefaultLight && !saved) applyTheme("light");
    else applyTheme(saved || "light");

    qsa(".themePick").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        applyTheme(b.dataset.theme);
      });
    });
  }

  function logout() {
    localStorage.clear();
    location.href = LOGIN;
  }

  function renderTopbarIdentity() {
    const name = localStorage.getItem("userName") || "Teacher";
    qs("#userName").textContent = name;

    const avatarEl = qs("#userAvatar");
    const avatarData = localStorage.getItem("userAvatar") || "";

    if (!avatarEl) return;

    if (avatarData) {
      avatarEl.style.backgroundImage = `url(${avatarData})`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.textContent = "";
    } else {
      avatarEl.style.backgroundImage = "";
      avatarEl.textContent = initials(name);
    }
  }

  function setupProfileDropdown() {
    qs("#userAvatar")?.addEventListener("click", (e) => {
      e.stopPropagation();
      qs("#profileMenu")?.classList.toggle("hidden");
    });

    qs("#logoutBtn")?.addEventListener("click", logout);
    qs("#sidebarLogout")?.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });

    document.addEventListener("click", (e) => {
      const wrap = qs("#topAvatarWrap");
      if (wrap && !wrap.contains(e.target)) qs("#profileMenu")?.classList.add("hidden");
    });
  }

  function openPersonalize() {
    qs("#personalizeBg")?.classList.remove("hidden");
    qs("#personalizeBg")?.classList.add("flex");
    document.body.style.overflow = "hidden";
    loadPersonalizeFields();
  }

  function closePersonalize() {
    qs("#personalizeBg")?.classList.add("hidden");
    qs("#personalizeBg")?.classList.remove("flex");
    document.body.style.overflow = "";
  }

  function loadPersonalizeFields() {
    const name = localStorage.getItem("userName") || "Teacher";
    const avatarData = localStorage.getItem("userAvatar") || "";
    const email = localStorage.getItem("userEmail") || "";

    const nameInput = qs("#profileNameInput");
    const emailInput = qs("#profileEmailInput");
    const preview = qs("#profileAvatarPreview");

    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;

    if (preview) {
      if (avatarData) {
        preview.style.backgroundImage = `url(${avatarData})`;
        preview.style.backgroundSize = "cover";
        preview.style.backgroundPosition = "center";
        preview.textContent = "";
      } else {
        preview.style.backgroundImage = "";
        preview.textContent = initials(name);
      }
    }
  }

  function setupPersonalizeModal() {
    qs("#openPersonalize")?.addEventListener("click", (e) => {
      e.preventDefault();
      qs("#profileMenu")?.classList.add("hidden");
      openPersonalize();
    });

    qs("#closePersonalize")?.addEventListener("click", closePersonalize);

    qs("#personalizeBg")?.addEventListener("click", (e) => {
      if (e.target === qs("#personalizeBg")) closePersonalize();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePersonalize();
    });

    qs("#profilePhotoInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        localStorage.setItem("userAvatar", ev.target.result);
        loadPersonalizeFields();
        renderTopbarIdentity();
      };
      reader.readAsDataURL(file);
    });

    qs("#removeAvatarBtn")?.addEventListener("click", () => {
      localStorage.removeItem("userAvatar");
      loadPersonalizeFields();
      renderTopbarIdentity();
    });

    qs("#savePersonalize")?.addEventListener("click", async () => {
      const newName = (qs("#profileNameInput")?.value || "").trim() || "Teacher";
      const newEmail = (qs("#profileEmailInput")?.value || "").trim();

      localStorage.setItem("userName", newName);
      localStorage.setItem("userEmail", newEmail);

      try {
        const res = await fetch(`${API}/me`, {
          method: "PUT",
          headers: jsonHeaders(),
          body: JSON.stringify({ name: newName, email: newEmail }),
        });
        const out = await safeJson(res);
        if (!res.ok || !out?.success) {
          toast(out?.message || "Could not save email to server", "rgba(185,28,28,.85)");
        } else {
          toast("Saved", "rgba(34,197,94,.70)");
        }
      } catch {
        toast("Server error saving profile", "rgba(185,28,28,.85)");
      }

      renderTopbarIdentity();
      await loadMeIntoUI();
      closePersonalize();
    });
  }

  async function loadMeIntoUI() {
    const topEmail = qs("#topEmail");
    try {
      const res = await fetch(`${API}/me`, { headers: actorHeaders() });
      const out = await safeJson(res);
      const email = out?.user?.email || localStorage.getItem("userEmail") || "";
      if (email) localStorage.setItem("userEmail", email);
      if (topEmail) topEmail.textContent = email || "—";
    } catch {
      if (topEmail) topEmail.textContent = localStorage.getItem("userEmail") || "—";
    }
  }

  /* remaining logic unchanged except role lists */

  async function loadNotifications() {
    const role = localStorage.getItem("role") || "";
    const username = localStorage.getItem("username") || "";
    if (!username || !["teacher", "instructor", "student"].includes(role)) return;

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

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
})();
