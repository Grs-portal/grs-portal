/* server.js */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- MIDDLEWARES ---------------- */
app.use(cors());
app.use(express.json());

/* ---------------- DETERMINE PUBLIC ROOT ---------------- */
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
app.use(express.static(publicDir));

/* ---------------- UPLOADS ---------------- */
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// serve uploaded files
app.use("/uploads", express.static(uploadsDir));

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    // allow pdf + common docs/images (adjust if you want)
    const ok = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!ok.includes(file.mimetype)) return cb(new Error("File type not allowed"));
    cb(null, true);
  }
});

/* ---------------- SIMPLE FILE DB ---------------- */
const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    accounts: [
      { username: "root", password: "1234", role: "instructor", name: "Instructor Root" },
      { username: "manager", password: "9999", role: "manager", name: "Project Manager" },
      { username: "student", password: "1234", role: "student", name: "Student" }
    ],
    courses: [
      {
        id: 1,
        title: "Intro to Programming",
        description: "Learn JS basics",
        location_type: "in-person", // "in-person" | "online" | "hybrid"
        location_detail: "Room 2",
        created_by: "root",
        attachment: null, // { url, originalName, mime, size }
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ],
    homework: [
      {
        id: 1,
        title: "Week 1 Assignment",
        description: "Intro tasks",
        course_id: 1,
        submitted_by: "root",
        attachment: null,
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ],
    students: [
      { enrollment_id: 1, username: "student", name: "Student", course: "Intro to Programming", grade: 9 }
    ],
    notifications: []
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function notify(type, message) {
  db.notifications.unshift({
    id: Date.now(),
    type, // "create" | "update" | "delete"
    message,
    at: Date.now()
  });
  db.notifications = db.notifications.slice(0, 100);
  saveData();
}

/* ---------------- AUTH (simple) ---------------- */
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

  res.json({ success: true, role: user.role, name: user.name, username: user.username, redirect });
});

/* ---------------- NOTIFICATIONS ---------------- */
app.get("/api/notifications", (req, res) => res.json(db.notifications));

/* ---------------- COURSES ---------------- */
// list
app.get("/api/courses", (req, res) => res.json(db.courses));

// create (multipart + optional file)
app.post("/api/courses", upload.single("file"), (req, res) => {
  const { title, description = "", created_by = "unknown", location_type = "in-person", location_detail = "" } = req.body || {};
  if (!title) return res.status(400).json({ success: false, message: "Title required" });

  const attachment = req.file
    ? {
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size
      }
    : null;

  const newCourse = {
    id: Date.now(),
    title,
    description,
    location_type,
    location_detail,
    created_by,
    attachment,
    created_at: Date.now(),
    updated_at: Date.now()
  };

  db.courses.push(newCourse);
  notify("create", `Course created: "${title}" by ${created_by}`);
  res.json({ success: true, course: newCourse });
});

// edit (multipart + optional file replace)
app.put("/api/courses/:id", upload.single("file"), (req, res) => {
  const id = String(req.params.id);
  const idx = db.courses.findIndex(c => String(c.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Course not found" });

  const before = db.courses[idx];

  const { title, description, location_type, location_detail, updated_by = "unknown" } = req.body || {};

  // replace attachment if uploaded
  let attachment = before.attachment;
  if (req.file) {
    // delete old file if exists
    if (before.attachment?.url) {
      const oldPath = path.join(__dirname, before.attachment.url.replace("/uploads/", "uploads/"));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    attachment = {
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size
    };
  }

  db.courses[idx] = {
    ...before,
    title: title ?? before.title,
    description: description ?? before.description,
    location_type: location_type ?? before.location_type,
    location_detail: location_detail ?? before.location_detail,
    attachment,
    updated_at: Date.now()
  };

  notify("update", `Course updated: "${db.courses[idx].title}" by ${updated_by}`);
  res.json({ success: true, course: db.courses[idx] });
});

// delete
app.delete("/api/courses/:id", (req, res) => {
  const id = String(req.params.id);
  const course = db.courses.find(c => String(c.id) === id);
  if (!course) return res.json({ success: true }); // idempotent

  // remove file if exists
  if (course.attachment?.url) {
    const filePath = path.join(__dirname, course.attachment.url.replace("/uploads/", "uploads/"));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.courses = db.courses.filter(c => String(c.id) !== id);
  notify("delete", `Course deleted: "${course.title}"`);
  res.json({ success: true });
});

/* ---------------- HOMEWORK ---------------- */
app.get("/api/homework", (req, res) => {
  // include course title for convenience
  const out = db.homework.map(h => {
    const c = db.courses.find(x => String(x.id) === String(h.course_id));
    return { ...h, course_title: c?.title || "" };
  });
  res.json(out);
});

// create homework with optional file
app.post("/api/homework", upload.single("file"), (req, res) => {
  const { title, description = "", course_id, submitted_by = "unknown" } = req.body || {};
  if (!title || !course_id) return res.status(400).json({ success: false, message: "Title and course_id required" });

  const attachment = req.file
    ? {
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size
      }
    : null;

  const hw = {
    id: Date.now(),
    title,
    description,
    course_id: Number(course_id),
    submitted_by,
    attachment,
    created_at: Date.now(),
    updated_at: Date.now()
  };

  db.homework.push(hw);
  notify("create", `Homework created: "${title}" by ${submitted_by}`);
  res.json({ success: true, homework: hw });
});

// edit homework
app.put("/api/homework/:id", upload.single("file"), (req, res) => {
  const id = String(req.params.id);
  const idx = db.homework.findIndex(h => String(h.id) === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Homework not found" });

  const before = db.homework[idx];
  const { title, description, course_id, updated_by = "unknown" } = req.body || {};

  let attachment = before.attachment;
  if (req.file) {
    if (before.attachment?.url) {
      const oldPath = path.join(__dirname, before.attachment.url.replace("/uploads/", "uploads/"));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    attachment = {
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size
    };
  }

  db.homework[idx] = {
    ...before,
    title: title ?? before.title,
    description: description ?? before.description,
    course_id: course_id ? Number(course_id) : before.course_id,
    attachment,
    updated_at: Date.now()
  };

  notify("update", `Homework updated: "${db.homework[idx].title}" by ${updated_by}`);
  res.json({ success: true, homework: db.homework[idx] });
});

// delete homework
app.delete("/api/homework/:id", (req, res) => {
  const id = String(req.params.id);
  const hw = db.homework.find(h => String(h.id) === id);
  if (!hw) return res.json({ success: true });

  if (hw.attachment?.url) {
    const filePath = path.join(__dirname, hw.attachment.url.replace("/uploads/", "uploads/"));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.homework = db.homework.filter(h => String(h.id) !== id);
  notify("delete", `Homework deleted: "${hw.title}"`);
  res.json({ success: true });
});

/* ---------------- STUDENTS ---------------- */
app.get("/api/students", (req, res) => res.json(db.students));
app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = db.students.findIndex(s => s.enrollment_id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Student not found" });

  db.students[idx] = { ...db.students[idx], ...req.body };
  saveData();
  res.json({ success: true, student: db.students[idx] });
});

/* ---------------- PAGE ROUTES ---------------- */
function sendFirstExisting(res, ...relativeCandidates) {
  for (const rel of relativeCandidates) {
    const abs = path.join(publicDir, rel);
    if (fs.existsSync(abs)) return res.sendFile(abs);
  }
  res.status(404).send("Not found");
}

app.get("/", (req, res) => sendFirstExisting(res, "homepage/index.html"));
app.get("/homepage/login.html", (req, res) => sendFirstExisting(res, "homepage/login.html"));
app.get("/homepage/register.html", (req, res) => sendFirstExisting(res, "homepage/register.html", "register.html"));

app.get("/instructor", (req, res) => sendFirstExisting(res, "instructor/index.html", "instructor/instructor.html"));
app.get("/manager", (req, res) => sendFirstExisting(res, "manager/index.html", "manager/manager.html"));
app.get("/students", (req, res) => sendFirstExisting(res, "students/student.html", "students/index.html"));

/* ---------------- START ---------------- */
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
