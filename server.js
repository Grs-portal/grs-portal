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
    students: [{ enrollment_id: 1, name: "John Doe", course: "Intro to Programming", grade: 9 }],
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

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

let db = loadData();

// ---------------- API ROUTES ----------------

// Courses
app.get("/api/courses", (req, res) => res.json(db.courses));

app.post("/api/courses", (req, res) => {
  const { title, description = "" } = req.body || {};
  if (!title) return res.status(400).json({ success: false, message: "Title required" });

  const newCourse = { id: Date.now(), title, description };
  db.courses.push(newCourse);
  saveData();
  res.json(newCourse);
});

app.delete("/api/courses/:id", (req, res) => {
  db.courses = db.courses.filter((c) => String(c.id) !== String(req.params.id));
  saveData();
  res.json({ success: true });
});

// Homework
app.get("/api/homework", (req, res) => res.json(db.homework));

app.post("/api/homework", (req, res) => {
  const { title, description = "", course, submitted_by = "" } = req.body || {};
  if (!title || !course) {
    return res.status(400).json({ success: false, message: "Title and course required" });
  }

  const newHW = { id: Date.now(), title, description, course, submitted_by };
  db.homework.push(newHW);
  saveData();
  res.json(newHW);
});

app.delete("/api/homework/:id", (req, res) => {
  db.homework = db.homework.filter((h) => String(h.id) !== String(req.params.id));
  saveData();
  res.json({ success: true });
});

// Students (Grades list)
app.get("/api/students", (req, res) => res.json(db.students));

app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = db.students.findIndex((s) => s.enrollment_id === id);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });

  db.students[idx] = { ...db.students[idx], ...req.body };
  saveData();
  res.json(db.students[idx]);
});

// ---------------- USERS (Accounts) API ----------------
// List users (NO passwords returned)
app.get("/api/users", (req, res) => {
  const safe = db.accounts.map(({ password, ...rest }) => rest);
  res.json(safe);
});

// Delete user (manager will use this)
app.delete("/api/users/:username", (req, res) => {
  const username = req.params.username;

  // protect critical accounts (optional)
  if (username === "root" || username === "manager") {
    return res.status(403).json({ success: false, message: "Cannot delete protected account" });
  }

  db.accounts = db.accounts.filter((a) => a.username !== username);
  saveData();
  res.json({ success: true });
});

// ---------------- AUTH + USERS ----------------

// ---------------- USERS (MANAGER ADMIN) ----------------

// List users (manager only)
app.get("/api/users", (req, res) => {
  const role = req.headers["x-role"] || req.query.role || "";
  if (role !== "manager") return res.status(403).json({ success: false, message: "Forbidden" });

  // don't send passwords to frontend
  const safe = accounts.map(({ password, ...rest }) => rest);
  res.json(safe);
});

// Create user (manager only)
app.post("/api/users", (req, res) => {
  const roleHeader = req.headers["x-role"] || "";
  if (roleHeader !== "manager") return res.status(403).json({ success: false, message: "Forbidden" });

  const { username, password, role, name } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: "Missing username/password/role" });
  }

  const allowedRoles = ["student", "instructor", "manager"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  if (accounts.find(a => a.username === username)) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  const newUser = {
    username,
    password,          // NOTE: plaintext for now (fine for testing, not production)
    role,
    name: name || username
  };

  accounts.push(newUser);

  // if student, also create a "student record" so they show in grades table
  if (role === "student") {
    students.push({
      enrollment_id: Date.now(),
      name: newUser.name,
      course: "Unassigned",
      grade: null,
      username: newUser.username
    });
  }

  res.json({
    success: true,
    message: "User created",
    user: { username: newUser.username, role: newUser.role, name: newUser.name }
  });
});

// Delete user (manager only)
app.delete("/api/users/:username", (req, res) => {
  const roleHeader = req.headers["x-role"] || "";
  if (roleHeader !== "manager") return res.status(403).json({ success: false, message: "Forbidden" });

  const uname = req.params.username;

  if (uname === "root") {
    return res.status(400).json({ success: false, message: "Cannot delete root" });
  }

  const before = accounts.length;
  accounts = accounts.filter(a => a.username !== uname);

  // remove from students list too (if exists)
  students = students.filter(s => s.username !== uname);

  if (accounts.length === before) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.json({ success: true });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false });

  const user = db.accounts.find(
    (a) => a.username === username.trim() && a.password === password.trim()
  );

  if (!user) return res.status(401).json({ success: false });

  const redirect =
    user.role === "instructor" ? "/instructor" :
    user.role === "manager" ? "/manager" :
    "/students";

  res.json({ success: true, role: user.role, name: user.name, redirect });
});

app.post("/api/register", (req, res) => {
  const { username, password, role = "student", name = username, course = "" } = req.body || {};

  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const cleanUsername = String(username).trim();
  const cleanPassword = String(password).trim();

  if (db.accounts.find((a) => a.username === cleanUsername)) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  const newAcc = {
    username: cleanUsername,
    password: cleanPassword,
    role,
    name: String(name).trim(),
  };

  db.accounts.push(newAcc);

  // If student, ALSO add them to grade list automatically
  if (role === "student") {
    const newStudent = {
      enrollment_id: Date.now(),
      name: newAcc.name,
      course: course || "Unassigned",
      grade: null,
    };
    db.students.push(newStudent);
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
app.get("/instructor", (req, res) => sendFirstExisting(res, "instructor/index.html"));
app.get("/manager", (req, res) => sendFirstExisting(res, "manager/manager.html"));
app.get("/students", (req, res) => sendFirstExisting(res, "students/student.html"));
app.get("/homepage/login.html", (req, res) => sendFirstExisting(res, "homepage/login.html"));
app.get("/homepage/register.html", (req, res) => sendFirstExisting(res, "homepage/register.html", "register.html"));

// ---------------- START ----------------
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));


