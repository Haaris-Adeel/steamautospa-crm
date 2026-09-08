const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db', { readonly: true });

const results = db.prepare(`
  SELECT c.name, j.date, j.price, j.title
  FROM Customer c
  JOIN Job j ON c.id = j.customerId
  WHERE j.date >= '2026-09-01T00:00:00.000Z'
  ORDER BY j.date
`).all();

console.log(JSON.stringify(results, null, 2));
db.close();
