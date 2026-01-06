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
    console.error("❌ Could not find public/ folder.");
    process.exit(1);
  }
}

const publicDir = path.join(rootDir, "public");
console.log("Serving static files from:", publicDir);
app.use(express.static(publicDir)); // serves /public/*

// ---------------- IN-MEMORY DATABASE ----------------
let accounts = [
  { username: "root", password: "1234", role: "instructor", name: "Instructor Root" },
  { username: "manager", password: "9999", role: "manager", name: "Project Manager" },
  { username: "student", password: "1234", role: "student", name: "Student" }
];

let courses = [{ id: 1, title: "Intro to Programming", description: "Learn JS basics" }];

let homework = [
  { id: 1, title: "Week 1 Assignment", description: "Intro tasks", submitted_by: "John Doe", course: "Intro to Programming" },
];

let students = [
  { enrollment_id: 1, name: "John Doe", course: "Intro to Programming", grade: 9 },
];

// ---------------- HELPERS ----------------
function sendFirstExisting(res, candidates) {
  for (const rel of candidates) {
    const abs = path.join(publicDir, rel);
    if (fs.existsSync(abs)) return res.sendFile(abs);
  }
  return res.status(404).send("Not Found (page file missing in public/)");
}

// ---------------- API ROUTES ----------------

// Courses
app.get("/api/courses", (req, res) => res.json(courses));
app.post("/api/courses", (req, res) => {
  const newCourse = { id: Date.now(), ...req.body };
  courses.push(newCourse);
  res.json(newCourse);
});
app.delete("/api/courses/:id", (req, res) => {
  courses = courses.filter((c) => c.id != req.params.id);
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
  homework = homework.filter((h) => h.id != req.params.id);
  res.json({ success: true });
});

// Students
app.get("/api/students", (req, res) => res.json(students));
app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = students.findIndex((s) => s.enrollment_id === id);
  if (idx !== -1) {
    students[idx] = { ...students[idx], ...req.body };
    res.json(students[idx]);
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

// ---------------- AUTH ----------------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false });

  const user = accounts.find((a) => a.username === username && a.password === password);
  if (!user) return res.status(401).json({ success: false });

  const redirect =
    user.role === "instructor"
      ? "/instructor/"
      : user.role === "manager"
      ? "/manager/"
      : "/students/";

  res.json({ success: true, role: user.role, name: user.name, redirect });
});

// ---------------- PAGE ROUTES ----------------

// homepage
app.get("/", (req, res) => {
  sendFirstExisting(res, [
    "homepage/index.html",
    "index.html",
  ]);
});

// instructor
app.get("/instructor", (req, res) => res.redirect(301, "/instructor/"));
app.get("/instructor/", (req, res) => {
  sendFirstExisting(res, [
    "instructor/index.html",
    "homepage/instructor/index.html",
    "instructor.html",
    "homepage/instructor.html",
  ]);
});

// manager
app.get("/manager", (req, res) => res.redirect(301, "/manager/"));
app.get("/manager/", (req, res) => {
  sendFirstExisting(res, [
    "manager/index.html",
    "homepage/manager/index.html",
    "manager.html",
    "homepage/manager.html",
  ]);
});

// students
app.get("/students", (req, res) => res.redirect(301, "/students/"));
app.get("/students/", (req, res) => {
  sendFirstExisting(res, [
    "students/index.html",
    "homepage/students/index.html",
    "students.html",
    "homepage/students.html",
  ]);
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
