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

// Check if public folder exists here or in src/
if (!fs.existsSync(path.join(rootDir, "public"))) {
  if (fs.existsSync(path.join(__dirname, "src", "public"))) {
    rootDir = path.join(__dirname, "src");
  } else {
    console.error("❌ Could not find public/ folder. Make sure it exists in root or src/");
    process.exit(1);
  }
}

console.log("Serving static files from:", path.join(rootDir, "public"));

// Serve all frontend files from /public
app.use(express.static(path.join(rootDir, "public")));

// ---------------- IN-MEMORY DATABASE ----------------
// NOTE: Replace with real DB and hashed passwords in production
let accounts = [
  { username: "root", password: "1234", role: "instructor", name: "Instructor Root" },
  { username: "manager", password: "9999", role: "manager", name: "Project Manager" }
];

let courses = [
  { id: 1, title: "Intro to Programming", description: "Learn JS basics" },
];

let homework = [
  {
    id: 1,
    title: "Week 1 Assignment",
    description: "Intro tasks",
    submitted_by: "John Doe",
    course: "Intro to Programming",
  },
];

let students = [
  {
    enrollment_id: 1,
    name: "John Doe",
    course: "Intro to Programming",
    grade: 9,
  },
];

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

// ---------------- AUTH ROUTES ----------------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }

  const user = accounts.find((a) => a.username === username && a.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Simple redirect based on role
  const redirect = user.role === "instructor" ? "/instructor/" : "/manager/";
  res.json({ success: true, role: user.role, name: user.name, redirect });
});

app.post("/api/register", (req, res) => {
  const { username, password, role = "instructor", name = username } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }
  if (accounts.find((a) => a.username === username)) {
    return res.status(400).json({ success: false, message: "Username taken" });
  }

  const newAcc = { username, password, role, name };
  accounts.push(newAcc);
  res.json({ success: true, message: "Account created", account: { username, role, name } });
});

// ---------------- STATIC ROUTES ----------------

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "homepage", "index.html"));
});

// Instructor portal
app.get("/instructor", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "instructor", "index.html"));
});

// Manager portal
app.get("/manager", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "manager", "manager.html"));
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
