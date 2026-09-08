const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath, { readonly: true });

try {
  // Get bookings from Sept 7-8
  const stmt = db.prepare(`
    SELECT c.id, c.name, c.email, j.id as jobId, j.title, j.date, j.price
    FROM Customer c
    JOIN Job j ON c.id = j.customerId
    WHERE datetime(j.date) >= '2026-09-07 00:00:00' AND datetime(j.date) < '2026-09-09 00:00:00'
    ORDER BY j.date
  `);

  const results = stmt.all();
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
