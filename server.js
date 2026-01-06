/* server.js */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

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

app.use(express.static(path.join(rootDir, "public")));

// ---------------- IN-MEMORY DATABASE ----------------
let accounts = [
  { username: "root", password: "1234", role: "instructor", name: "Instructor Root" },
  { username: "manager", password: "9999", role: "manager", name: "Project Manager" },
  { username: "student", password: "1234", role: "student", name: "Student" }
];

let courses = [{ id: 1, title: "Intro to Programming", description: "Learn JS basics" }];
let homework = [{
  id: 1, title: "Week 1 Assignment", description: "Intro tasks",
  submitted_by: "John Doe", course: "Intro to Programming",
}];
let students = [{ enrollment_id: 1, name: "John Doe", course: "Intro to Programming", grade: 9 }];

// ---------------- API ROUTES ----------------
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

  // IMPORTANT: no trailing slashes
  const redirect =
    user.role === "instructor" ? "/instructor" :
    user.role === "manager" ? "/manager" :
    "/students";

  res.json({ success: true, role: user.role, name: user.name, redirect });
});

// ---------------- PAGES ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "homepage", "index.html"));
});

// Serve portals explicitly (prevents “Cannot GET /students/” + weird static behavior)
app.get("/instructor", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "instructor", "index.html"));
});
app.get("/manager", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "manager", "index.html"));
});
app.get("/students", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "students", "index.html"));
});

// Optional: normalize trailing slashes to no-slash
app.get("/instructor/", (req, res) => res.redirect(301, "/instructor"));
app.get("/manager/", (req, res) => res.redirect(301, "/manager"));
app.get("/students/", (req, res) => res.redirect(301, "/students"));

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
