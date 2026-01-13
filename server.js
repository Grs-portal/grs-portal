/* server.js */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

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

// ---------------- SIMPLE FILE DB (PERSISTENT) ----------------
// IMPORTANT for Render: writeable path should be local project dir. This is fine for dev/testing.
// In production, Render filesystem may reset on deploy — but for now it works.
const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    accounts: [
      { username: "root", password: "1234", role: "instructor", name: "Instructor Root" },
      { username: "manager", password: "9999", role: "manager", name: "Project Manager" },
      { username: "student", password: "1234", role: "student", name: "Student" },
    ],
    courses: [{ id: 1, title: "Intro to Programming", description: "Learn JS basics" }],
    homework: [
      {
        id: 1,
        title: "Week 1 Assignment",
        description: "Intro tasks",
        submitted_by: "John Doe",
        course: "Intro to Programming",
      },
    ],
    // This is the "grades table"
    students: [
      { enrollment_id: 1, username: "student", name: "Student", course: "Unassigned", grade: null },
      { enrollment_id: 2, username: null, name: "John Doe", course: "Intro to Programming", grade: 9 },
    ],
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("❌ Failed to load data.json, using defaults:", e);
    return defaultData();
  }
}

let db = loadData();

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("❌ Failed to save data.json:", e);
  }
}

// ---------------- HELPERS ----------------
function requireManager(req, res) {
  const role = String(req.headers["x-role"] || req.query.role || "").trim();
  if (role !== "manager") {
    res.status(403).json({ success: false, message: "Forbidden (manager only)" });
    return false;
  }
  return true;
}

function safeUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

// ---------------- API ROUTES ----------------

// ===== COURSES =====
app.get("/api/courses", (req, res) => res.json(db.courses));

app.post("/api/courses", (req, res) => {
  const { title, description = "" } = req.body || {};
  if (!title) return res.status(400).json({ success: false, message: "Title required" });

  const newCourse = { id: Date.now(), title: String(title).trim(), description: String(description || "").trim() };
  db.courses.push(newCourse);
  saveData();
  res.json(newCourse);
});

app.delete("/api/courses/:id", (req, res) => {
  db.courses = db.courses.filter((c) => String(c.id) !== String(req.params.id));
  saveData();
  res.json({ success: true });
});

// ===== HOMEWORK =====
app.get("/api/homework", (req, res) => res.json(db.homework));

app.post("/api/homework", (req, res) => {
  const { title, description = "", course, submitted_by = "" } = req.body || {};
  if (!title || !course) {
    return res.status(400).json({ success: false, message: "Title and course required" });
  }

  const newHW = {
    id: Date.now(),
    title: String(title).trim(),
    description: String(description || "").trim(),
    course: String(course).trim(),
    submitted_by: String(submitted_by || "").trim(),
  };

  db.homework.push(newHW);
  saveData();
  res.json(newHW);
});

app.delete("/api/homework/:id", (req, res) => {
  db.homework = db.homework.filter((h) => String(h.id) !== String(req.params.id));
  saveData();
  res.json({ success: true });
});

// ===== STUDENTS / GRADES TABLE =====
app.get("/api/students", (req, res) => res.json(db.students));

app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = db.students.findIndex((s) => Number(s.enrollment_id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Student not found" });

  db.students[idx] = { ...db.students[idx], ...req.body };
  saveData();
  res.json(db.students[idx]);
});

// ===== USERS (ACCOUNTS) =====
// list users (manager only, no passwords)
app.get("/api/users", (req, res) => {
  if (!requireManager(req, res)) return;
  res.json(db.accounts.map(safeUser));
});

// create user (manager only)
app.post("/api/users", (req, res) => {
  if (!requireManager(req, res)) return;

  const { username, password, role, name } = req.body || {};
  const u = String(username || "").trim();
  const p = String(password || "").trim();
  const r = String(role || "").trim();
  const n = String(name || u).trim();

  if (!u || !p || !r) {
    return res.status(400).json({ success: false, message: "Missing username/password/role" });
  }

  const allowedRoles = ["student", "instructor", "manager"];
  if (!allowedRoles.includes(r)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  if (db.accounts.some((a) => a.username === u)) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  const newUser = { username: u, password: p, role: r, name: n };
  db.accounts.push(newUser);

  // If student: ensure they appear in grades table too
  if (r === "student") {
    db.students.push({
      enrollment_id: Date.now(),
      username: u,
      name: n,
      course: "Unassigned",
      grade: null,
    });
  }

  saveData();
  res.json({ success: true, user: safeUser(newUser) });
});

// delete user (manager only)
app.delete("/api/users/:username", (req, res) => {
  if (!requireManager(req, res)) return;

  const uname = String(req.params.username || "").trim();
  if (!uname) return res.status(400).json({ success: false, message: "Missing username" });

  // protect these accounts
  if (uname === "root" || uname === "manager") {
    return res.status(403).json({ success: false, message: "Cannot delete protected account" });
  }

  const before = db.accounts.length;
  db.accounts = db.accounts.filter((a) => a.username !== uname);

  // also remove from grades table if it exists there
  db.students = db.students.filter((s) => s.username !== uname);

  if (db.accounts.length === before) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  saveData();
  res.json({ success: true });
});

// ===== AUTH =====
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = String(username || "").trim();
  const p = String(password || "").trim();
  if (!u || !p) return res.status(400).json({ success: false, message: "Missing credentials" });

  const user = db.accounts.find((a) => a.username === u && a.password === p);
  if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

  const redirect =
    user.role === "instructor" ? "/instructor" :
    user.role === "manager" ? "/manager" :
    "/students";

  res.json({ success: true, role: user.role, name: user.name, redirect });
});

// OPTIONAL: register endpoint (if you still use it)
app.post("/api/register", (req, res) => {
  const { username, password, role = "student", name } = req.body || {};
  const u = String(username || "").trim();
  const p = String(password || "").trim();
  const r = String(role || "").trim();
  const n = String(name || u).trim();

  if (!u || !p) return res.status(400).json({ success: false, message: "Missing fields" });
  if (db.accounts.some((a) => a.username === u)) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  const newUser = { username: u, password: p, role: r, name: n };
  db.accounts.push(newUser);

  if (r === "student") {
    db.students.push({
      enrollment_id: Date.now(),
      username: u,
      name: n,
      course: "Unassigned",
      grade: null,
    });
  }

  saveData();
  res.json({ success: true });
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
app.get("/homepage/login.html", (req, res) => sendFirstExisting(res, "homepage/login.html"));
app.get("/homepage/register.html", (req, res) => sendFirstExisting(res, "homepage/register.html", "register.html"));

app.get("/instructor", (req, res) => sendFirstExisting(res, "instructor/index.html", "instructor/instructor.html"));
app.get("/manager", (req, res) => sendFirstExisting(res, "manager/index.html", "manager/manager.html"));
app.get("/students", (req, res) => sendFirstExisting(res, "students/index.html", "students/student.html"));

// ---------------- START ----------------
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
