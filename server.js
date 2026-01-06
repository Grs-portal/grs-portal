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

// Serve all frontend files from /public
app.use(express.static(publicDir));

// ---------------- IN-MEMORY DATABASE ----------------
let accounts = [
  { username: "root", password: "1234", role: "instructor", name: "Instructor Root" },
  { username: "manager", password: "9999", role: "manager", name: "Project Manager" },
  { username: "student", password: "1234", role: "student", name: "Student" },
];

let courses = [{ id: 1, title: "Intro to Programming", description: "Learn JS basics" }];

let homework = [
  {
    id: 1,
    title: "Week 1 Assignment",
    description: "Intro tasks",
    submitted_by: "John Doe",
    course: "Intro to Programming",
  },
];

let students = [{ enrollment_id: 1, name: "John Doe", course: "Intro to Programming", grade: 9 }];

// ---------------- API ROUTES ----------------

// Courses
app.get("/api/courses", (req, res) => res.json(courses));
app.post("/api/courses", (req, res) => {
  const newCourse = { id: Date.now(), ...req.body };
  courses.push(newCourse);
  res.json(newCourse);
});
app.delete("/api/courses/:id", (req, res) => {
  courses = courses.filter((c) => String(c.id) !== String(req.params.id));
  res.json({ success: true });
});

// Homework
app.get("/api/homework", (req, res) => res.json(homework));
app.post("/api/homework", (req, res) => {
  const newHW = { id: Date.now(), ...req.body };
  homework.push(newHW);
  res.json(newHW);
});
app.delete("/api/homework/:id", (req, res) => {
  homework = homework.filter((h) => String(h.id) !== String(req.params.id));
  res.json({ success: true });
});

// Students
app.get("/api/students", (req, res) => res.json(students));
app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = students.findIndex((s) => s.enrollment_id === id);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });
  students[idx] = { ...students[idx], ...req.body };
  res.json(students[idx]);
});

// ---------------- AUTH ----------------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false });

  const user = accounts.find((a) => a.username === username && a.password === password);
  if (!user) return res.status(401).json({ success: false });

  // IMPORTANT:
  // Use paths WITHOUT trailing slashes to avoid redirect loops.
  const redirect =
    user.role === "instructor"
      ? "/instructor"
      : user.role === "manager"
      ? "/manager"
      : "/students";

  res.json({ success: true, role: user.role, name: user.name, redirect });
});

// ---------------- PAGE HELPERS ----------------
function sendFirstExisting(res, ...relativeCandidates) {
  for (const rel of relativeCandidates) {
    const abs = path.join(publicDir, rel);
    if (fs.existsSync(abs)) return res.sendFile(abs);
  }
  return res.status(404).send("Not found: " + relativeCandidates.join(" OR "));
}

// ---------------- PAGE ROUTES ----------------

// Homepage
app.get("/", (req, res) => {
  sendFirstExisting(res, "homepage/index.html", "index.html");
});

// Login: supports both /homepage/login.html AND /login
app.get("/homepage/login.html", (req, res) => {
  sendFirstExisting(res, "homepage/login.html", "login.html");
});
app.get("/login", (req, res) => res.redirect(302, "/homepage/login.html"));
app.get("/login.html", (req, res) => res.redirect(302, "/homepage/login.html"));

// Register:
// Your error was "Cannot GET /homepage/register.html"
// In your repo, register.html is in public root, so we map both URLs:
app.get("/register.html", (req, res) => {
  sendFirstExisting(res, "register.html");
});
app.get("/homepage/register.html", (req, res) => {
  // points to the same file (public/register.html)
  sendFirstExisting(res, "register.html");
});

// Instructor portal
app.get("/instructor", (req, res) => {
  sendFirstExisting(res, "instructor/index.html", "instructor/instructor.html");
});
app.get("/instructor/", (req, res) => res.redirect(301, "/instructor"));

// Manager portal
app.get("/manager", (req, res) => {
  sendFirstExisting(res, "manager/index.html", "manager/manager.html");
});
app.get("/manager/", (req, res) => res.redirect(301, "/manager"));

// Student portal
// Your repo has students/student.html, so we serve that as the main students page:
app.get("/students", (req, res) => {
  sendFirstExisting(res, "students/student.html", "students/index.html");
});
app.get("/students/", (req, res) => res.redirect(301, "/students"));

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
