const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log("🧩 Setting up database...");

  // Drop old tables
  db.run(`DROP TABLE IF EXISTS homework`);
  db.run(`DROP TABLE IF EXISTS enrollments`);
  db.run(`DROP TABLE IF EXISTS students`);
  db.run(`DROP TABLE IF EXISTS courses`);

  // Create new tables
  db.run(`
    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      course_id INTEGER,
      grade TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  db.run(`
    CREATE TABLE homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      submitted_by TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Insert demo data
  const students = ["Alice Johnson", "Ben Smith", "Charlie Davis", "Diana Lee"];
  const courses = [
    { title: "Web Development 101", description: "Intro to HTML, CSS, JS", is_active: 1 },
    { title: "Advanced JavaScript", description: "Master modern JS", is_active: 1 }
  ];

  students.forEach(name => db.run(`INSERT INTO students (name) VALUES (?)`, [name]));
  courses.forEach(c => db.run(`INSERT INTO courses (title, description, is_active) VALUES (?, ?, ?)`, [c.title, c.description, c.is_active]));

  setTimeout(() => {
    db.run(`INSERT INTO enrollments (student_id, course_id, grade) VALUES (1, 1, 'A')`);
    db.run(`INSERT INTO enrollments (student_id, course_id, grade) VALUES (2, 1, 'B+')`);
    db.run(`INSERT INTO enrollments (student_id, course_id, grade) VALUES (3, 2, 'A-')`);
    db.run(`INSERT INTO enrollments (student_id, course_id, grade) VALUES (4, 2, 'B')`);

    db.run(`INSERT INTO homework (course_id, title, description, submitted_by) VALUES (1, 'HTML Basics', 'Homework on HTML tags', 'Alice Johnson')`);
    db.run(`INSERT INTO homework (course_id, title, description, submitted_by) VALUES (2, 'Async JS', 'Homework on Promises and async/await', 'Charlie Davis')`);

    console.log("✅ Demo data inserted successfully!");
    db.close();
  }, 500);
});
