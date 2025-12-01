import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Fix paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve all frontend files from /public
app.use(express.static(path.join(__dirname, "public")));

// ---------------- API DATA ----------------
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

// COURSES
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

// HOMEWORK
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

// STUDENTS
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

// ---------------- STATIC ROUTES ----------------

// Login page (root)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Any .html route (manager.html, instructor.html, etc.)
app.get("/*.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", req.path));
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
