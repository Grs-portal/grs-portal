/* server.js */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Multer (uploads)
let multer = null;
try {
  multer = require("multer");
} catch (e) {
  console.warn("⚠️ multer not installed. Uploads will be disabled until you install it.");
}

// Nodemailer (email)
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  console.warn("⚠️ nodemailer not installed. Email sending disabled until you install it (npm i nodemailer).");
}

const app = express();
const PORT = process.env.PORT || 3000;

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
    courses: [{ id: 1, title: "Intro to Programming", description: "Learn JS basics", locationType: "in-person" }],
    homework: [
      {
        id: 1,
        title: "Week 1 Assignment",
        description: "Intro tasks",
        submitted_by: "John Doe",
        course: "Intro to Programming",
      },
    ],
    students: [{ enrollment_id: 1, name: "John Doe", course: "Intro to Programming", grade: 9, username: "" }],
    notifications: [],
    schedule: [] // ✅ schedule events stored here
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
    }
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

    raw.notifications = Array.isArray(raw.notifications) ? raw.notifications : [];
    raw.schedule = Array.isArray(raw.schedule) ? raw.schedule : [];

    raw.accounts = Array.isArray(raw.accounts) ? raw.accounts : defaultData().accounts;
    raw.courses = Array.isArray(raw.courses) ? raw.courses : defaultData().courses;
    raw.homework = Array.isArray(raw.homework) ? raw.homework : defaultData().homework;
    raw.students = Array.isArray(raw.students) ? raw.students : defaultData().students;

    // ✅ ensure email exists on accounts
    raw.accounts = raw.accounts.map(a => ({
      email: "",
      ...a,
      email: String(a.email || "").trim()
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

function isValidEmail(email) {
  const e = String(email || "").trim();
  if (!e) return true; // allow empty
  // simple validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ---------------- EMAIL (GMAIL) ----------------
const GMAIL_USER = String(process.env.GMAIL_USER || "").trim();
const GMAIL_APP_PASSWORD = String(process.env.GMAIL_APP_PASSWORD || "").trim();
const EMAIL_FROM_NAME = String(process.env.EMAIL_FROM_NAME || "Hofi Korsou Portal").trim();

let mailer = null;
if (nodemailer && GMAIL_USER && GMAIL_APP_PASSWORD) {
  mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
  console.log("✅ Email enabled via Gmail:", GMAIL_USER);
} else {
  console.log("ℹ️ Email disabled (missing nodemailer or env vars).");
}

// anti-spam: throttle per recipient
const lastEmailAt = new Map(); // email -> timestamp

async function sendEmail(to, subject, html) {
  if (!mailer) return;
  const email = String(to || "").trim();
  if (!email) return;

  const now = Date.now();
  const last = lastEmailAt.get(email) || 0;
  if (now - last < 30_000) return; // 30s throttle
  lastEmailAt.set(email, now);

  try {
    await mailer.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${GMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
  } catch (e) {
    console.warn("✉️ Email send failed:", e.message);
  }
}

function getRecipientsForNotification(n) {
  const accounts = Array.isArray(db.accounts) ? db.accounts : [];
  const audienceRole = n.audienceRole || "all";
  const audienceUsername = String(n.audienceUsername || "").trim();

  // collect recipients by visibility
  let recipients = [];

  if (audienceRole === "all") {
    recipients = accounts;
  } else if (audienceRole === "all-students") {
    recipients = accounts.filter(a => a.role === "student");
  } else if (audienceRole === "student") {
    recipients = accounts.filter(a => a.role === "student" && a.username === audienceUsername);
  } else {
    recipients = accounts; // fallback
  }

  // return emails only
  return recipients
    .map(a => String(a.email || "").trim())
    .filter(e => e && isValidEmail(e));
}

/**
 * addNotification supports targeting:
 * audienceRole:
 *  - "all" (default)
 *  - "all-students"
 *  - "student" + audienceUsername
 */
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
    id: Date.now(),
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
  db.notifications = db.notifications.slice(0, 200);
  saveData();

  // ✅ EMAIL "NEWS" = send notification to emails
  const subject = `[Hofi Korsou] ${String(type || "update").toUpperCase()}: ${String(action || "update")}`;
  const html = `
    <div style="font-family:Arial, sans-serif; line-height:1.5;">
      <h2 style="margin:0 0 8px;">Hofi Korsou Portal Update</h2>
      <p style="margin:0 0 10px;">${String(message || "").replace(/</g, "&lt;")}</p>
      <p style="margin:0; color:#555; font-size:12px;">
        By: ${String(byName || byUsername || "System")} (${String(byRole || "")})<br/>
        Time: ${new Date(n.ts).toLocaleString()}
      </p>
    </div>
  `;

  const recipients = getRecipientsForNotification(n);
  recipients.forEach((email) => sendEmail(email, subject, html));

  return n;
}

// ---------------- UPLOADS ----------------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// serve uploaded files
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

// Upload endpoint (PDF)
app.post("/api/upload", (req, res) => {
  if (!upload) return res.status(500).json({ success: false, message: "Uploads not enabled (multer missing)" });

  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ success: false, message: "Only PDF allowed" });
    }

    return res.json({
      success: true,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname
    });
  });
});

// ---------------- API ROUTES ----------------
// ---------- ME (profile) ----------
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
  if (typeof email === "string") user.email = email.trim();

  saveData();
  res.json({ success: true, user: safeNoPassword(user) });
});

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

// ---------- SCHEDULE (v1) ----------
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

/* ═════════ COURSES API ═════════ */

app.get("/api/courses", (req, res) => {
  res.json(db.courses || []);
});


app.post("/api/courses", (req, res) => {

  const {
      title,
      description,
      cover,
      durationValue,
      durationUnit,
      sessionsValue,
      sessionsUnit,
      programType,
      theme,
      offer,
      status,
      startDate,
      createdByUsername,
      createdByAvatar
    } = req.body || {};

  if (!title) {
    return res.status(400).json({
      success:false,
      message:"Title required"
    });
  }

  const newCourse = {
    id: Date.now().toString(),
    title,
    description: description || "",
    cover: cover || "/images/Logo HK.ppg",
  
    durationValue,
    durationUnit,
    sessionsValue,
    sessionsUnit,
  
    programType,
    theme,
    offer,
  
    startDate: startDate || null,
  
    status: status || "draft",
  
    createdByUsername: createdByUsername || "Unknown",
    createdByAvatar: createdByAvatar || null,
  
    createdAt: new Date().toISOString(),
    updatedAt: null
  };
  
    db.courses.push(newCourse);
    saveData();
  
    res.json(newCourse);
  });


app.put("/api/courses/:id", (req,res)=>{

  const id = req.params.id;

  const idx = db.courses.findIndex(c => c.id === id);

  if(idx === -1){
    return res.status(404).json({success:false});
  }

  db.courses[idx] = {
    ...db.courses[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  saveData();

  res.json(db.courses[idx]);
});


app.delete("/api/courses/:id",(req,res)=>{

  const id = req.params.id;

  db.courses = db.courses.filter(c=>c.id!==id);

  saveData();

  res.json({success:true});

});

/* ═════════ HOMEWORK ═════════ */
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

/* ═════════ STUDENTS ═════════ */
app.get("/api/students", (req, res) => res.json(db.students));

app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = db.students.findIndex((s) => s.enrollment_id === id);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });

  db.students[idx] = { ...db.students[idx], ...req.body };
  saveData();
  res.json(db.students[idx]);
});

/* ═════════ USERS (MANAGER ADMIN) ═════════ */
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

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email" });
  }

  const allowedRoles = ["student", "instructor", "manager"];
  if (!allowedRoles.includes(newRole)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  const cleanUsername = String(username).trim();
  if (db.accounts.find(a => a.username === cleanUsername)) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  const newUser = {
    username: cleanUsername,
    password: String(password),
    role: newRole,
    name: String(name || cleanUsername).trim(),
    email: String(email || "").trim(),
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

/* ═════════ AUTH ═════════ */
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

// OPTIONAL: disable online register
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
app.get("/homepage/register.html", (req, res) => sendFirstExisting(res, "homepage/register.html", "register.html"));

// ---------------- START ----------------
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));







