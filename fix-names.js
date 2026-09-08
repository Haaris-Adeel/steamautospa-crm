const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db');

// Fix the names for Marcy and Sue
const updates = [
  {
    email: 'customer_117@booking.local',
    newName: 'Marcy',
    date: '2026-09-07'
  },
  {
    email: 'customer_118@booking.local',
    newName: 'Sue',
    date: '2026-09-08'
  }
];

updates.forEach(update => {
  const result = db.prepare('UPDATE Customer SET name = ? WHERE email = ?').run(
    update.newName,
    update.email
  );
  console.log(`Updated ${update.email} to "${update.newName}": ${result.changes} rows affected`);
});

// Verify the changes
const verify = db.prepare(`
  SELECT c.name, j.date, j.price, j.title
  FROM Customer c
  JOIN Job j ON c.id = j.customerId
  WHERE j.date >= '2026-09-07T00:00:00.000Z' AND j.date < '2026-09-10T00:00:00.000Z'
  ORDER BY j.date
`).all();

console.log('\nVerification - 9-7-26 to 9-9-26 bookings:');
verify.forEach(row => {
  console.log(`${row.date}: ${row.name} - $${row.price} - ${row.title}`);
});

db.close();
