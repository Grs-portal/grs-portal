-- init.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT DEFAULT '',
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- seed courses
INSERT INTO courses (title, description, is_active) VALUES
  ('Mental Health First Aid', 'Intro course', 1),
  ('Wellness & Mindfulness', 'Course on wellbeing', 1);

-- seed students
INSERT INTO students (name) VALUES
  ('Alice Johnson'),
  ('Brian Kim'),
  ('Sara Lopez'),
  ('David Lee');

-- create enrollments (student -> course)
INSERT INTO enrollments (student_id, course_id, grade) VALUES
  (1, 1, '7'),
  (2, 2, '8'),
  (3, 1, '7.5'),
  (4, 2, '6');
