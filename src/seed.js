// seed.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// Create students table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      grade TEXT
    )
  `);

  // Insert sample data
  const stmt = db.prepare("INSERT INTO students (name, grade) VALUES (?, ?)");
  const students = [
    ["Alice Johnson", "A"],
    ["Ben Carter", "B"],
    ["Chloe Kim", "A-"],
    ["David Lopez", "B+"]
  ];

  for (const s of students) {
    stmt.run(s);
  }

  stmt.finalize();
  console.log("✅ Sample students inserted!");
});

db.close();
