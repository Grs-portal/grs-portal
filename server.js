/* server.js */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- PUBLIC DIR ----------
let rootDir = __dirname;
if (!fs.existsSync(path.join(rootDir, "public"))) {
  if (fs.existsSync(path.join(__dirname, "src", "public"))) rootDir = path.join(__dirname, "src");
  else {
    console.error("❌ Could not find public/ folder (root/public or root/src/public).");
    process.exit(1);
  }
}
const publicDir = path.join(rootDir, "public");
app.use(express.static(publicDir));

// ---------- UPLOADS (PDF ONLY) ----------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_, file, cb) => {
    const ok = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    cb(ok ? null : new Error("Only PDF files allowed"), ok);
  },
});

app.use("/uploads", express.static(uploadsDir));

// ---------- FILE DB ----------
const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    accounts: [
      { username: "root", password: "1234", role: "instructor", name: "Instructor Root" },
      { username: "manager", password: "9999", role: "manager", name: "Project Manager" },
      { username: "student", password: "1234", role: "student", name: "Student" },
    ],
    courses: [
      { id: 1, title: "Intro to Programming", description: "Learn JS basics", delivery: "online", submitted_by: "Instructor Root", attachments: [] }
    ],
    homework: [
      { id: 1, title: "Week 1 Assignment", description: "Intro tasks", course: "Intro to Programming", submitted_by: "Instructor Root", attachments: [] },
    ],
    students: [
      { enrollment_id: 1, name: "John Doe", course: "Intro to Programming", grade: 9, username: "johndoe" }
    ],
    notifications: [], // {id, type, message, createdAt}
    nextNotifId: 1
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("❌ Failed to load data.json, using defaults:", e);
    return defaultData();
  }
}
let db = loadData();
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }

// ---------- HELPERS ----------
function actorFromReq(req) {
  const role = String(req.headers["x-role"] || "").trim();
  const username = String(req.headers["x-username"] || "").trim();
  const name = String(req.headers["x-name"] || "").trim();
  return { role, username, name };
}

function requireRole(roles) {
  return (req, res, next) => {
    const { role } = actorFromReq(req);
    if (!roles.includes(role)) return res.status(403).json({ success: false, message: "Forbidden" });
    next();
  };
}

function pushNotif(type, message) {
  db.notifications.push({
    id: db.nextNotifId++,
    type,
    message,
    createdAt: Date.now()
  });
  // keep last 200
  if (db.notifications.length > 200) db.notifications = db.notifications.slice(-200);
}

// ---------- AUTH ----------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false });

  const u = db.accounts.find(a => a.username === String(username).trim() && a.password === String(password).trim());
  if (!u) return res.status(401).json({ success: false });

  const redirect = u.role === "instructor" ? "/instructor" : u.role === "manager" ? "/manager" : "/students";
  res.json({ success: true, role: u.role, name: u.name, username: u.username, redirect });
});

// NOTE: your register page is info-only now, but we keep API for manager-created users.
app.post("/api/register", (req, res) => {
  return res.status(403).json({ success: false, message: "Online registration disabled" });
});

// ---------- USERS (MANAGER) ----------
app.get("/api/users", requireRole(["manager"]), (req, res) => {
  const safe = db.accounts.map(({ password, ...rest }) => rest);
  res.json(safe);
});

app.post("/api/users", requireRole(["manager"]), (req, res) => {
  const { username, password, role, name } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ success: false, message: "Missing fields" });

  const uname = String(username).trim();
  if (db.accounts.find(a => a.username === uname)) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  const allowed = ["student", "instructor", "manager"];
  if (!allowed.includes(role)) return res.status(400).json({ success: false, message: "Invalid role" });

  const newAcc = { username: uname, password: String(password).trim(), role, name: String(name || uname).trim() };
  db.accounts.push(newAcc);

  if (role === "student") {
    db.students.push({
      enrollment_id: Date.now(),
      name: newAcc.name,
      course: "Unassigned",
      grade: null,
      username: newAcc.username
    });
  }

  pushNotif("user_created", `User created: ${newAcc.username} (${newAcc.role})`);
  saveData();
  res.json({ success: true, user: { username: newAcc.username, role: newAcc.role, name: newAcc.name } });
});

app.delete("/api/users/:username", requireRole(["manager"]), (req, res) => {
  const uname = String(req.params.username || "");
  if (["root", "manager"].includes(uname)) {
    return res.status(403).json({ success: false, message: "Cannot delete protected account" });
  }

  const before = db.accounts.length;
  db.accounts = db.accounts.filter(a => a.username !== uname);
  db.students = db.students.filter(s => s.username !== uname);

  if (db.accounts.length === before) return res.status(404).json({ success: false, message: "User not found" });

  pushNotif("user_deleted", `User deleted: ${uname}`);
  saveData();
  res.json({ success: true });
});

// ---------- COURSES ----------
app.get("/api/courses", (req, res) => res.json(db.courses));

app.post("/api/courses", requireRole(["manager", "instructor"]), upload.array("pdfs", 5), (req, res) => {
  const { name } = actorFromReq(req);
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const delivery = String(req.body.delivery || "online").trim();

  if (!title) return res.status(400).json({ success: false, message: "Title required" });
  if (!["in_person", "online", "hybrid"].includes(delivery)) {
    return res.status(400).json({ success: false, message: "Invalid delivery" });
  }

  const attachments = (req.files || []).map(f => ({
    originalName: f.originalname,
    filename: f.filename,
    url: `/uploads/${f.filename}`,
    uploadedAt: Date.now()
  }));

  const course = {
    id: Date.now(),
    title,
    description,
    delivery,
    submitted_by: name || "Unknown",
    attachments
  };

  db.courses.push(course);
  pushNotif("course_created", `Course created: ${title}`);
  saveData();
  res.json(course);
});

app.put("/api/courses/:id", requireRole(["manager", "instructor"]), upload.array("pdfs", 5), (req, res) => {
  const id = String(req.params.id);
  const idx = db.courses.findIndex(c => String(c.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Course not found" });

  const title = req.body.title != null ? String(req.body.title).trim() : db.courses[idx].title;
  const description = req.body.description != null ? String(req.body.description).trim() : db.courses[idx].description;
  const delivery = req.body.delivery != null ? String(req.body.delivery).trim() : db.courses[idx].delivery;

  if (!title) return res.status(400).json({ success: false, message: "Title required" });
  if (!["in_person", "online", "hybrid"].includes(delivery)) {
    return res.status(400).json({ success: false, message: "Invalid delivery" });
  }

  const newFiles = (req.files || []).map(f => ({
    originalName: f.originalname,
    filename: f.filename,
    url: `/uploads/${f.filename}`,
    uploadedAt: Date.now()
  }));

  db.courses[idx] = {
    ...db.courses[idx],
    title,
    description,
    delivery,
    attachments: [...(db.courses[idx].attachments || []), ...newFiles]
  };

  pushNotif("course_updated", `Course updated: ${db.courses[idx].title}`);
  saveData();
  res.json(db.courses[idx]);
});

app.delete("/api/courses/:id", requireRole(["manager", "instructor"]), (req, res) => {
  const id = String(req.params.id);
  const course = db.courses.find(c => String(c.id) === id);
  db.courses = db.courses.filter(c => String(c.id) !== id);
  pushNotif("course_deleted", `Course deleted: ${course?.title || id}`);
  saveData();
  res.json({ success: true });
});

// ---------- HOMEWORK ----------
app.get("/api/homework", (req, res) => res.json(db.homework));

app.post("/api/homework", requireRole(["manager", "instructor"]), upload.array("pdfs", 5), (req, res) => {
  const { name } = actorFromReq(req);
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const course = String(req.body.course || "").trim();

  if (!title || !course) return res.status(400).json({ success: false, message: "Title and course required" });

  const attachments = (req.files || []).map(f => ({
    originalName: f.originalname,
    filename: f.filename,
    url: `/uploads/${f.filename}`,
    uploadedAt: Date.now()
  }));

  const hw = {
    id: Date.now(),
    title,
    description,
    course,
    submitted_by: name || "Unknown",
    attachments
  };

  db.homework.push(hw);
  pushNotif("homework_created", `Homework created: ${title}`);
  saveData();
  res.json(hw);
});

app.put("/api/homework/:id", requireRole(["manager", "instructor"]), upload.array("pdfs", 5), (req, res) => {
  const id = String(req.params.id);
  const idx = db.homework.findIndex(h => String(h.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Homework not found" });

  const title = req.body.title != null ? String(req.body.title).trim() : db.homework[idx].title;
  const description = req.body.description != null ? String(req.body.description).trim() : db.homework[idx].description;
  const course = req.body.course != null ? String(req.body.course).trim() : db.homework[idx].course;

  if (!title || !course) return res.status(400).json({ success: false, message: "Title and course required" });

  const newFiles = (req.files || []).map(f => ({
    originalName: f.originalname,
    filename: f.filename,
    url: `/uploads/${f.filename}`,
    uploadedAt: Date.now()
  }));

  db.homework[idx] = {
    ...db.homework[idx],
    title,
    description,
    course,
    attachments: [...(db.homework[idx].attachments || []), ...newFiles]
  };

  pushNotif("homework_updated", `Homework updated: ${db.homework[idx].title}`);
  saveData();
  res.json(db.homework[idx]);
});

app.delete("/api/homework/:id", requireRole(["manager", "instructor"]), (req, res) => {
  const id = String(req.params.id);
  const hw = db.homework.find(h => String(h.id) === id);
  db.homework = db.homework.filter(h => String(h.id) !== id);
  pushNotif("homework_deleted", `Homework deleted: ${hw?.title || id}`);
  saveData();
  res.json({ success: true });
});

// ---------- STUDENTS (GRADES) ----------
app.get("/api/students", (req, res) => res.json(db.students));

app.put("/api/students/:id", requireRole(["manager", "instructor"]), (req, res) => {
  const id = Number(req.params.id);
  const idx = db.students.findIndex(s => s.enrollment_id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Student not found" });

  db.students[idx] = { ...db.students[idx], ...req.body };
  pushNotif("grade_updated", `Grade updated for ${db.students[idx].name}`);
  saveData();
  res.json(db.students[idx]);
});

// ---------- NOTIFICATIONS ----------
app.get("/api/notifications", (req, res) => {
  const since = Number(req.query.since || 0);
  const out = db.notifications.filter(n => n.id > since);
  res.json(out);
});

// ---------- PAGES ----------
function sendFirstExisting(res, ...rel) {
  for (const r of rel) {
    const abs = path.join(publicDir, r);
    if (fs.existsSync(abs)) return res.sendFile(abs);
  }
  res.status(404).send("Not found");
}

app.get("/", (req, res) => sendFirstExisting(res, "homepage/index.html"));
app.get("/homepage/login.html", (req, res) => sendFirstExisting(res, "homepage/login.html"));
app.get("/homepage/register.html", (req, res) => sendFirstExisting(res, "homepage/register.html", "register.html"));

app.get("/instructor", (req, res) => sendFirstExisting(res, "instructor/index.html", "instructor/instructor.html"));
app.get("/manager", (req, res) => sendFirstExisting(res, "manager/index.html", "manager/manager.html"));
app.get("/students", (req, res) => sendFirstExisting(res, "students/index.html", "students/student.html"));

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
