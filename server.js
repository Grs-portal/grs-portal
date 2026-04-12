/* server.js */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Resend } = require("resend");

// Multer (uploads)
let multer = null;
try {
  multer = require("multer");
} catch (e) {
  console.warn("⚠️ multer not installed. Uploads will be disabled until you install it.");
}

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- EMAIL SETUP (RESEND API) ----------------
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "Hofi Korsou <onboarding@resend.dev>";

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  console.log("✅ Resend email API ready");
} else {
  console.warn("⚠️ RESEND_API_KEY missing. News emails will be disabled.");
}

// ---------------- MIDDLEWARES ----------------
app.use(cors());
app.use(express.json());

// ---------------- DETERMINE PUBLIC ROOT ----------------
let rootDir = __dirname;

if (!fs.existsSync(path.join(rootDir, "public"))) {
  if (fs.existsSync(path.join(__dirname, "src", "public"))) {
    rootDir = path.join(__dirname, "src");
  } else {
    console.error("❌ Could not find public/ folder (root/public or root/src/public).");
    process.exit(1);
  }
}

const publicDir = path.join(rootDir, "public");
console.log("✅ Serving static files from:", publicDir);
app.use(express.static(publicDir));

// ---------------- SIMPLE FILE DB ----------------
const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    accounts: [
      { username: "root", password: "1234", role: "instructor", name: "Instructor Root", email: "", avatarUrl: "" },
      { username: "manager", password: "9999", role: "manager", name: "Project Manager", email: "", avatarUrl: "" },
      { username: "student", password: "1234", role: "student", name: "Student", email: "", avatarUrl: "" },
    ],
    courses: [
      {
        id: 1,
        title: "Intro to Programming",
        description: "Learn JS basics",
        cover: "",
    
        durationValue: "2",
        durationUnit: "hours",
    
        sessionsValue: "8",
        sessionsUnit: "weekly",
    
        programType: "ALL",
        theme: "ALL",
    
        startDate: null,
        endDate: null,
        status: "draft"
      }
    ],
    homework: [
      {
        id: 1,
        title: "Week 1 Assignment",
        description: "Intro tasks",
        submitted_by: "John Doe",
        course: "Intro to Programming",
        pdfUrl: "",
        pdfName: ""
      },
    ],
    students: [
      { enrollment_id: 1, name: "John Doe", course: "Intro to Programming", grade: 9, username: "student" }
    ],
    notifications: [],
    schedule: [],
    news: [],
    projects: []
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
    }

    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const defs = defaultData();

    raw.accounts = Array.isArray(raw.accounts) ? raw.accounts : defs.accounts;
    raw.courses = Array.isArray(raw.courses) ? raw.courses : defs.courses;
    raw.homework = Array.isArray(raw.homework) ? raw.homework : defs.homework;
    raw.students = Array.isArray(raw.students) ? raw.students : defs.students;
    raw.notifications = Array.isArray(raw.notifications) ? raw.notifications : [];
    raw.schedule = Array.isArray(raw.schedule) ? raw.schedule : [];
    raw.news = Array.isArray(raw.news) ? raw.news : [];
    raw.projects = Array.isArray(raw.projects) ? raw.projects : [];

    raw.accounts = raw.accounts.map((a) => ({
      email: "",
      avatarUrl: "",
      ...a,
    }));

    return raw;
  } catch (e) {
    console.error("❌ Failed to load data.json, using defaults:", e);
    return defaultData();
  }
}

let db = loadData();

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// ---------------- HELPERS ----------------
function actorFromReq(req) {
  return {
    byUsername: String(req.headers["x-username"] || "").trim(),
    byRole: String(req.headers["x-role"] || "").trim(),
    byName: String(req.headers["x-name"] || "").trim(),
  };
}

function addNotification({
  type,
  action,
  message,
  byRole,
  byName,
  byUsername,
  targetType,
  targetId,
  audienceRole = "all",
  audienceUsername = ""
}) {
  const n = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    ts: new Date().toISOString(),
    type,
    action,
    message,
    byRole,
    byName,
    byUsername,
    targetType,
    targetId,
    audienceRole,
    audienceUsername,
    readBy: []
  };
  db.notifications.unshift(n);
  db.notifications = db.notifications.slice(0, 300);
  saveData();
  return n;
}

function requireRole(req, res, allowedRoles = []) {
  const role = String(req.headers["x-role"] || req.query.role || "").trim();
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return role;
}

function safeNoPassword(a) {
  const { password, ...rest } = a;
  return rest;
}

function isISODate(s) {
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function validEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendNewsEmails(newsItem) {
  if (!resend) {
    console.warn("⚠️ Email skipped: Resend not configured");
    return;
  }

  const recipients = db.accounts
    .map((a) => String(a.email || "").trim())
    .filter((email) => email && validEmail(email));

  if (!recipients.length) {
    console.warn("⚠️ No valid email recipients found for news");
    return;
  }

  const html = `
  <div style="font-family: Inter, Arial, sans-serif; background:#f4f7f5; padding:40px 0;">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">

      <div style="background:#22c55e;padding:20px 30px;color:white">
        <h2 style="margin:0;font-size:22px;">🌿 Hofi Korsou Portal</h2>
        <p style="margin:4px 0 0 0;font-size:13px;opacity:.9">Official portal notification</p>
      </div>

      <div style="padding:30px">
        <h1 style="margin-top:0;font-size:26px;color:#111827">
          ${escapeHtml(newsItem.title)}
        </h1>

        ${
          newsItem.summary
            ? `<p style="color:#4b5563;font-size:16px;margin-top:10px">
                ${escapeHtml(newsItem.summary)}
              </p>`
            : ""
        }

        ${
          newsItem.content
            ? `<div style="margin-top:20px;font-size:15px;color:#111827;line-height:1.6;white-space:pre-wrap">
                ${escapeHtml(newsItem.content)}
              </div>`
            : ""
        }

        <div style="margin-top:30px;padding:15px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0">
          <strong>Posted by:</strong> ${escapeHtml(newsItem.createdBy || "Manager")} <br>
          <strong>Date:</strong> ${new Date(newsItem.createdAt).toLocaleString()}
        </div>

        <div style="margin-top:30px;text-align:center">
          <a href="https://www.greenrecoveryspace.com"
             style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
             Open Portal
          </a>
        </div>

        <p style="margin-top:15px;font-size:13px;color:#6b7280;text-align:center">
          Need help?
          <a href="https://wa.me/59990000001" style="color:#16a34a;">Contact us on WhatsApp</a>
        </p>
      </div>

      <div style="padding:18px 30px;background:#f9fafb;font-size:12px;color:#6b7280">
        This message was sent automatically from the Hofi Korsou Portal.<br>
        If you were not expecting this email, you can ignore it.
      </div>

    </div>
  </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [RESEND_FROM],
      bcc: recipients,
      subject: `Hofi Korsou News: ${newsItem.title}`,
      html,
    });

    if (error) {
      console.error("❌ Failed to send news email via Resend:", error);
      return;
    }

    console.log(`✅ News email sent to ${recipients.length} recipient(s)`);
  } catch (err) {
    console.error("❌ Failed to send news email via Resend:", err);
  }
}

// ---------------- UPLOADS ----------------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use("/uploads", express.static(uploadsDir));

let upload = null;

if (multer) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  });

  upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  });
}

// ---------- UPLOAD FILE (IMAGES + PDF/DOCS) ----------
app.post("/api/upload", (req, res) => {
  if (!upload) {
    return res.status(500).json({
      success: false,
      message: "Multer not installed"
    });
  }

  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();

    const allowedImages = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
    const allowedDocs = [".pdf", ".doc", ".docx", ".txt"];

    if (![...allowedImages, ...allowedDocs].includes(ext)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Allowed: images + pdf/doc/txt"
      });
    }

    const type = allowedImages.includes(ext) ? "image" : "document";

    return res.json({
      success: true,
      type,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname
    });
  });
});

// ---------- UPLOAD VIA IMAGE LINK ----------
app.post("/api/upload-by-url", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.startsWith("http")) {
      return res.status(400).json({
        success: false,
        message: "Valid URL required"
      });
    }

    const ext = path.extname(url.split("?")[0]).toLowerCase();
    const allowedImages = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

    if (!allowedImages.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: "Only image URLs allowed"
      });
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Failed to fetch image"
      });
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    return res.json({
      success: true,
      type: "image",
      url: `/uploads/${fileName}`
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Upload via URL failed"
    });
  }
});



// ---------------- API ROUTES ----------------

// ---------- NOTIFICATIONS ----------
app.get("/api/notifications", (req, res) => {
  const username = String(req.query.username || "").trim();
  const role = String(req.query.role || "").trim();
  if (!username || !role) return res.status(400).json({ success: false, message: "username+role required" });

  if (!["instructor", "manager", "student"].includes(role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const items = db.notifications
    .filter(n => {
      const aRole = n.audienceRole || "all";
      const aUser = n.audienceUsername || "";

      if (aRole === "all") return true;
      if (aRole === "all-students") return role === "student";
      if (aRole === "student") return role === "student" && aUser === username;
      return true;
    })
    .slice(0, 50)
    .map(n => ({
      ...n,
      unread: !n.readBy.includes(username)
    }));

  res.json({ success: true, items });
});

app.post("/api/notifications/read-all", (req, res) => {
  const { username, role } = req.body || {};
  if (!username || !role) return res.status(400).json({ success: false });

  if (!["instructor", "manager", "student"].includes(String(role))) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  db.notifications.forEach(n => {
    const aRole = n.audienceRole || "all";
    const aUser = n.audienceUsername || "";

    const visible =
      aRole === "all" ||
      (aRole === "all-students" && role === "student") ||
      (aRole === "student" && role === "student" && aUser === username);

    if (visible && !n.readBy.includes(username)) n.readBy.push(username);
  });

  saveData();
  res.json({ success: true });
});

// ---------- ME ----------
app.get("/api/me", (req, res) => {
  const username = String(req.headers["x-username"] || "").trim();
  const role = String(req.headers["x-role"] || "").trim();
  if (!username || !role) return res.status(401).json({ success: false, message: "Not logged in" });

  const user = db.accounts.find(a => a.username === username);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  res.json({ success: true, user: safeNoPassword(user) });
});

app.put("/api/me", (req, res) => {
  const username = String(req.headers["x-username"] || "").trim();
  const role = String(req.headers["x-role"] || "").trim();
  if (!username || !role) return res.status(401).json({ success: false, message: "Not logged in" });

  const user = db.accounts.find(a => a.username === username);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const { name, email } = req.body || {};

  if (typeof name === "string" && name.trim()) user.name = name.trim();

  if (typeof email === "string") {
    const cleanEmail = email.trim();
    if (!validEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    user.email = cleanEmail;
  }

  saveData();
  res.json({ success: true, user: safeNoPassword(user) });
});

// ---------- NEWS ----------
app.get("/api/news", (req, res) => {
  const items = (db.news || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, items });
});

app.post("/api/news", async (req, res) => {
  const role = requireRole(req, res, ["manager"]);
  if (!role) return;

  const a = actorFromReq(req);
  const { title, content = "", summary = "" } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: "Title required" });
  }

  const item = {
    id: Date.now(),
    title: String(title).trim(),
    summary: String(summary || "").trim(),
    content: String(content || "").trim(),
    createdBy: a.byName || a.byUsername || "Manager",
    createdByUsername: a.byUsername || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.news = Array.isArray(db.news) ? db.news : [];
  db.news.unshift(item);
  saveData();

  addNotification({
    type: "news",
    action: "created",
    message: `News posted: "${item.title}"`,
    ...a,
    targetType: "news",
    targetId: item.id,
    audienceRole: "all"
  });

  await sendNewsEmails(item);

  res.json({ success: true, item });
});

app.put("/api/news/:id", (req, res) => {
  const role = requireRole(req, res, ["manager"]);
  if (!role) return;

  const id = String(req.params.id);
  const idx = db.news.findIndex(n => String(n.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "News not found" });

  const a = actorFromReq(req);
  const { title, summary, content } = req.body || {};

  if (typeof title === "string" && !title.trim()) {
    return res.status(400).json({ success: false, message: "Title cannot be empty" });
  }

  db.news[idx] = {
    ...db.news[idx],
    ...(typeof title === "string" ? { title: title.trim() } : {}),
    ...(typeof summary === "string" ? { summary: summary.trim() } : {}),
    ...(typeof content === "string" ? { content: content.trim() } : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: a.byName || a.byUsername || "Manager"
  };

  saveData();

  addNotification({
    type: "news",
    action: "updated",
    message: `News updated: "${db.news[idx].title}"`,
    ...a,
    targetType: "news",
    targetId: id,
    audienceRole: "all"
  });

  res.json({ success: true, item: db.news[idx] });
});

app.delete("/api/news/:id", (req, res) => {
  const role = requireRole(req, res, ["manager"]);
  if (!role) return;

  const id = String(req.params.id);
  const idx = db.news.findIndex(n => String(n.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "News not found" });

  const item = db.news[idx];
  db.news.splice(idx, 1);
  saveData();

  const a = actorFromReq(req);
  addNotification({
    type: "news",
    action: "deleted",
    message: `News deleted: "${item.title}"`,
    ...a,
    targetType: "news",
    targetId: id,
    audienceRole: "all"
  });

  res.json({ success: true });
});

// ---------- SCHEDULE ----------
app.get("/api/schedule", (req, res) => {
  const role = String(req.query.role || req.headers["x-role"] || "").trim();
  const username = String(req.query.username || req.headers["x-username"] || "").trim();

  if (role === "student") {
    if (!username) return res.status(400).json({ success: false, message: "Missing username" });

    const now = Date.now();
    const items = (db.schedule || [])
      .filter(e => e && e.start)
      .filter(e => {
        return (
          e.audienceRole === "all-students" ||
          (e.audienceRole === "student" && String(e.audienceUsername || "") === username)
        );
      })
      .filter(e => {
        const endMs = new Date(e.end || e.start).getTime();
        return !isNaN(endMs) && endMs >= (now - 60 * 60 * 1000);
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 200);

    return res.json({ success: true, items });
  }

  if (!["manager", "instructor"].includes(role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const items = (db.schedule || []).slice().sort((a, b) => new Date(a.start) - new Date(b.start));
  res.json({ success: true, items });
});

app.post("/api/schedule", (req, res) => {
  const role = requireRole(req, res, ["manager", "instructor"]);
  if (!role) return;

  const a = actorFromReq(req);
  const {
    title,
    course = "",
    start,
    end,
    location = "",
    notes = "",
    audienceRole = "all-students",
    audienceUsername = ""
  } = req.body || {};

  if (!title) return res.status(400).json({ success: false, message: "title required" });
  if (!start || !isISODate(start)) return res.status(400).json({ success: false, message: "start must be ISO date" });
  if (end && !isISODate(end)) return res.status(400).json({ success: false, message: "end must be ISO date" });

  if (!["all-students", "student"].includes(audienceRole)) {
    return res.status(400).json({ success: false, message: "audienceRole must be all-students or student" });
  }
  if (audienceRole === "student" && !String(audienceUsername).trim()) {
    return res.status(400).json({ success: false, message: "audienceUsername required for audienceRole=student" });
  }

  const ev = {
    id: Date.now(),
    title: String(title),
    course: String(course || ""),
    start: new Date(start).toISOString(),
    end: end ? new Date(end).toISOString() : new Date(start).toISOString(),
    location: String(location || ""),
    notes: String(notes || ""),
    audienceRole,
    audienceUsername: audienceRole === "student" ? String(audienceUsername).trim() : "",
    createdBy: a.byName || a.byUsername || "Unknown",
    createdByUsername: a.byUsername || "",
    createdByRole: a.byRole || "",
    createdAt: new Date().toISOString()
  };

  db.schedule = Array.isArray(db.schedule) ? db.schedule : [];
  db.schedule.push(ev);
  saveData();

  addNotification({
    type: "schedule",
    action: "created",
    message: audienceRole === "student"
      ? `New schedule: "${ev.title}" (for ${ev.audienceUsername})`
      : `New schedule: "${ev.title}"`,
    ...a,
    targetType: "schedule",
    targetId: ev.id,
    audienceRole: audienceRole === "student" ? "student" : "all-students",
    audienceUsername: audienceRole === "student" ? ev.audienceUsername : ""
  });

  res.json({ success: true, item: ev });
});

app.put("/api/schedule/:id", (req, res) => {
  const role = requireRole(req, res, ["manager", "instructor"]);
  if (!role) return;

  const a = actorFromReq(req);
  const id = String(req.params.id);
  db.schedule = Array.isArray(db.schedule) ? db.schedule : [];

  const idx = db.schedule.findIndex(e => String(e.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Schedule event not found" });

  const prev = db.schedule[idx];
  const patch = { ...req.body };

  if (patch.start && !isISODate(patch.start)) return res.status(400).json({ success: false, message: "start must be ISO date" });
  if (patch.end && !isISODate(patch.end)) return res.status(400).json({ success: false, message: "end must be ISO date" });

  if (patch.audienceRole && !["all-students", "student"].includes(patch.audienceRole)) {
    return res.status(400).json({ success: false, message: "audienceRole must be all-students or student" });
  }

  if ((patch.audienceRole || prev.audienceRole) === "student") {
    const u = String(patch.audienceUsername ?? prev.audienceUsername ?? "").trim();
    if (!u) return res.status(400).json({ success: false, message: "audienceUsername required for audienceRole=student" });
    patch.audienceUsername = u;
  }

  db.schedule[idx] = {
    ...prev,
    ...patch,
    start: patch.start ? new Date(patch.start).toISOString() : prev.start,
    end: patch.end ? new Date(patch.end).toISOString() : prev.end,
    updatedBy: a.byName || a.byUsername || "Unknown",
    updatedByUsername: a.byUsername || "",
    updatedByRole: a.byRole || "",
    updatedAt: new Date().toISOString()
  };

  saveData();

  const ev = db.schedule[idx];
  addNotification({
    type: "schedule",
    action: "updated",
    message: ev.audienceRole === "student"
      ? `Schedule updated: "${ev.title}" (for ${ev.audienceUsername})`
      : `Schedule updated: "${ev.title}"`,
    ...a,
    targetType: "schedule",
    targetId: ev.id,
    audienceRole: ev.audienceRole === "student" ? "student" : "all-students",
    audienceUsername: ev.audienceRole === "student" ? String(ev.audienceUsername || "") : ""
  });

  res.json({ success: true, item: ev });
});

app.delete("/api/schedule/:id", (req, res) => {
  const role = requireRole(req, res, ["manager", "instructor"]);
  if (!role) return;

  const a = actorFromReq(req);
  const id = String(req.params.id);
  db.schedule = Array.isArray(db.schedule) ? db.schedule : [];

  const idx = db.schedule.findIndex(e => String(e.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Schedule event not found" });

  const ev = db.schedule[idx];
  db.schedule.splice(idx, 1);
  saveData();

  addNotification({
    type: "schedule",
    action: "deleted",
    message: ev.audienceRole === "student"
      ? `Schedule deleted: "${ev.title}" (for ${ev.audienceUsername})`
      : `Schedule deleted: "${ev.title}"`,
    ...a,
    targetType: "schedule",
    targetId: id,
    audienceRole: ev.audienceRole === "student" ? "student" : "all-students",
    audienceUsername: ev.audienceRole === "student" ? String(ev.audienceUsername || "") : ""
  });

  res.json({ success: true });
});


const STRAPI_URL = "http://localhost:1337/api/courses";

// ---------- COURSES (STRAPI BRIDGE) ----------

// GET ALL (dashboard)
app.get("/api/courses", async (req, res) => {
  try {
    const r = await fetch(`${STRAPI_URL}?populate=*`);
    const data = await r.json();

    const courses = data.data.map(item => ({
      id: item.id,
      ...item.attributes
    }));

    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// GET ONLY PUBLISHED (public site)
app.get("/api/courses/published", async (req, res) => {
  try {
    const r = await fetch(`${STRAPI_URL}?filters[published][$eq]=true&populate=*`);
    const data = await r.json();

    const courses = data.data.map(item => ({
      id: item.id,
      ...item.attributes
    }));

    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch published courses" });
  }
});

// GET ONE
app.get("/api/courses/:id", async (req, res) => {
  try {
    const r = await fetch(`${STRAPI_URL}/${req.params.id}?populate=*`);
    const data = await r.json();

    if (!data.data) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.json({
      success: true,
      course: {
        id: data.data.id,
        ...data.data.attributes
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

// CREATE
app.post("/api/courses", async (req, res) => {
  try {
    const r = await fetch(STRAPI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // add token later if needed
      },
      body: JSON.stringify({
        data: req.body
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(400).json(data);
    }

    res.json({
      success: true,
      item: {
        id: data.data.id,
        ...data.data.attributes
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create failed" });
  }
});

// UPDATE
app.put("/api/courses/:id", async (req, res) => {
  try {
    const r = await fetch(`${STRAPI_URL}/${req.params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: req.body
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(400).json(data);
    }

    res.json({
      success: true,
      item: {
        id: data.data.id,
        ...data.data.attributes
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE
app.delete("/api/courses/:id", async (req, res) => {
  try {
    const r = await fetch(`${STRAPI_URL}/${req.params.id}`, {
      method: "DELETE"
    });

    if (!r.ok) {
      return res.status(400).json({ error: "Delete failed" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});


// ---------- PROJECTS ----------
app.get("/api/projects", (req, res) => {
  res.json(db.projects || []);
});

app.post("/api/projects", (req, res) => {
  const { title, cover = "", description = "", status = "draft" } = req.body || {};

  if (!title) {
    return res.status(400).json({ success: false, message: "Title required" });
  }

  const newProject = {
    id: Date.now(),
    title,
    cover,
    description,
    status,
    createdAt: new Date().toISOString()
  };

  db.projects = db.projects || [];
  db.projects.push(newProject);
  saveData();

  res.json({ success: true, item: newProject }); // ✅ ONLY response
});

app.get("/api/projects/:id", (req, res) => {
  const id = String(req.params.id);
  const project = (db.projects || []).find(p => String(p.id) === id);

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  res.json({ success: true, project });
});

// UPDATE project
app.put("/api/projects/:id", (req, res) => {
  const id = String(req.params.id);
  const idx = (db.projects || []).findIndex(p => String(p.id) === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  db.projects[idx] = {
    ...db.projects[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  saveData();

  res.json({ success: true, item: db.projects[idx] });
});

// DELETE project
app.delete("/api/projects/:id", (req, res) => {
  const id = String(req.params.id);
  const before = db.projects.length;

  db.projects = (db.projects || []).filter(p => String(p.id) !== id);

  if (db.projects.length === before) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  saveData();

  res.json({ success: true });
});


// ---------- HOMEWORK ----------
app.get("/api/homework", (req, res) => res.json(db.homework));

app.post("/api/homework", (req, res) => {
  const { title, description = "", course, submitted_by, pdfUrl = "", pdfName = "" } = req.body || {};
  if (!title || !course) return res.status(400).json({ success: false, message: "Title and course required" });

  const a = actorFromReq(req);
  const autoBy = a.byName || a.byUsername || "Unknown";

  const newHW = {
    id: Date.now(),
    title,
    description,
    course,
    submitted_by: (submitted_by && String(submitted_by).trim()) || autoBy,
    pdfUrl,
    pdfName,
    createdBy: autoBy,
    createdByUsername: a.byUsername || "",
    createdByRole: a.byRole || "",
    createdAt: new Date().toISOString()
  };

  db.homework.push(newHW);
  saveData();

  addNotification({
    type: "homework",
    action: "created",
    message: `Homework created: "${newHW.title}" (${newHW.course})`,
    ...a,
    targetType: "homework",
    targetId: newHW.id,
    audienceRole: "all"
  });

  res.json(newHW);
});

app.put("/api/homework/:id", (req, res) => {
  const id = String(req.params.id);
  const idx = db.homework.findIndex(h => String(h.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Homework not found" });

  const a = actorFromReq(req);

  db.homework[idx] = {
    ...db.homework[idx],
    ...req.body,
    updatedBy: a.byName || a.byUsername || "Unknown",
    updatedByUsername: a.byUsername || "",
    updatedByRole: a.byRole || "",
    updatedAt: new Date().toISOString()
  };

  saveData();

  addNotification({
    type: "homework",
    action: "updated",
    message: `Homework updated: "${db.homework[idx].title}" (${db.homework[idx].course})`,
    ...a,
    targetType: "homework",
    targetId: id,
    audienceRole: "all"
  });

  res.json(db.homework[idx]);
});

app.delete("/api/homework/:id", (req, res) => {
  const id = String(req.params.id);
  const before = db.homework.length;
  db.homework = db.homework.filter(h => String(h.id) !== id);
  saveData();

  const a = actorFromReq(req);
  if (db.homework.length !== before) {
    addNotification({
      type: "homework",
      action: "deleted",
      message: `Homework deleted (id: ${id})`,
      ...a,
      targetType: "homework",
      targetId: id,
      audienceRole: "all"
    });
  }

  res.json({ success: true });
});

// ---------- STUDENTS ----------
app.get("/api/students", (req, res) => res.json(db.students));

app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = db.students.findIndex((s) => s.enrollment_id === id);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });

  db.students[idx] = { ...db.students[idx], ...req.body };
  saveData();
  res.json(db.students[idx]);
});

// ---------- USERS ----------
app.get("/api/users", (req, res) => {
  const role = requireRole(req, res, ["manager"]);
  if (!role) return;
  res.json(db.accounts.map(safeNoPassword));
});

app.post("/api/users", (req, res) => {
  const role = requireRole(req, res, ["manager"]);
  if (!role) return;

  const { username, password, role: newRole, name, email = "" } = req.body || {};
  if (!username || !password || !newRole) {
    return res.status(400).json({ success: false, message: "Missing username/password/role" });
  }

  const allowedRoles = ["student", "instructor", "manager"];
  if (!allowedRoles.includes(newRole)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email || "").trim();

  if (!validEmail(cleanEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email" });
  }

  if (db.accounts.find(a => a.username === cleanUsername)) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  const newUser = {
    username: cleanUsername,
    password: String(password),
    role: newRole,
    name: String(name || cleanUsername).trim(),
    email: cleanEmail,
    avatarUrl: ""
  };

  db.accounts.push(newUser);

  if (newRole === "student") {
    db.students.push({
      enrollment_id: Date.now(),
      name: newUser.name,
      course: "Unassigned",
      grade: null,
      username: newUser.username
    });
  }

  saveData();

  const a = actorFromReq(req);
  addNotification({
    type: "user",
    action: "created",
    message: `User created: "${newUser.username}" (${newUser.role})`,
    ...a,
    targetType: "user",
    targetId: newUser.username,
    audienceRole: "all"
  });

  res.json({ success: true, user: safeNoPassword(newUser) });
});

app.delete("/api/users/:username", (req, res) => {
  const role = requireRole(req, res, ["manager"]);
  if (!role) return;

  const uname = String(req.params.username || "").trim();
  if (["root", "manager"].includes(uname)) {
    return res.status(403).json({ success: false, message: "Cannot delete protected account" });
  }

  const before = db.accounts.length;
  db.accounts = db.accounts.filter(a => a.username !== uname);
  db.students = db.students.filter(s => s.username !== uname);

  if (db.accounts.length === before) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  saveData();

  const a = actorFromReq(req);
  addNotification({
    type: "user",
    action: "deleted",
    message: `User deleted: "${uname}"`,
    ...a,
    targetType: "user",
    targetId: uname,
    audienceRole: "all"
  });

  res.json({ success: true });
});

// ---------- AUTH ----------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false });

  const user = db.accounts.find(
    (a) => a.username === String(username).trim() && a.password === String(password).trim()
  );

  if (!user) return res.status(401).json({ success: false });

  const redirect =
    user.role === "instructor" ? "/instructor" :
    user.role === "manager" ? "/manager" :
    "/students";

  res.json({
    success: true,
    role: user.role,
    name: user.name,
    username: user.username,
    email: user.email || "",
    redirect
  });
});

app.post("/api/register", (req, res) => {
  return res.status(403).json({ success: false, message: "Online registration disabled. Visit Hofi Korsou." });
});

// ---------------- PAGE ROUTES ----------------
function sendFirstExisting(res, ...relativeCandidates) {
  for (const rel of relativeCandidates) {
    const abs = path.join(publicDir, rel);
    if (fs.existsSync(abs)) return res.sendFile(abs);
  }
  res.status(404).send("Not found: " + relativeCandidates.join(" OR "));
}

app.get("/", (req, res) => sendFirstExisting(res, "homepage/index.html"));
app.get("/instructor", (req, res) => sendFirstExisting(res, "instructor/index.html"));
app.get("/manager", (req, res) => sendFirstExisting(res, "manager/manager.html"));
app.get("/students", (req, res) => sendFirstExisting(res, "students/student.html"));
app.get("/homepage/login.html", (req, res) => sendFirstExisting(res, "homepage/login.html"));
app.get("/homepage/login-student.html", (req, res) => sendFirstExisting(res, "homepage/login-student.html", "homepage/login.html"));
app.get("/homepage/login-instructor.html", (req, res) => sendFirstExisting(res, "homepage/login-instructor.html", "homepage/login.html"));
app.get("/homepage/login-manager.html", (req, res) => sendFirstExisting(res, "homepage/login-manager.html", "homepage/login.html"));
app.get("/homepage/register.html", (req, res) => sendFirstExisting(res, "homepage/register.html", "register.html"));

// ---------------- START ----------------
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
