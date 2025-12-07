const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.DATABASE_FILE || './clinica.db');

const init = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      isAdmin INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      duration_minutes INTEGER DEFAULT 60,
      description TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      service_id INTEGER,
      date TEXT,
      time TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(service_id) REFERENCES services(id)
    )`);
    // seed services if empty
    db.get("SELECT COUNT(*) as c FROM services", (err, row) => {
      if (row && row.c === 0) {
        const stmt = db.prepare("INSERT INTO services (name, duration_minutes, description) VALUES (?, ?, ?)");
        stmt.run("Cílios", 60, "Aplicação de cílios");
        stmt.run("Sobrancelha", 30, "Correção de sobrancelha");
        stmt.run("Sobrancelha com Hena", 45, "Sobrancelha e henna");
        stmt.finalize();
      }
    });
  });
};

module.exports = { db, init };
