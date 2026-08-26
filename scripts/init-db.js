const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20260817014550_init', 'migration.sql');

const db = new Database(dbPath);

// Read and execute migration
const sql = fs.readFileSync(migrationPath, 'utf-8');
db.exec(sql);

console.log('✓ Database initialized with schema');

// Now add users
const bcrypt = require('bcryptjs');

const adminHash = bcrypt.hashSync('admin123', 10);
const employeeHash = bcrypt.hashSync('emp123', 10);

db.exec(`
  INSERT OR IGNORE INTO User (email, password, name, role) VALUES
    ('admin@example.com', '${adminHash}', 'Admin User', 'admin'),
    ('employee@example.com', '${employeeHash}', 'Employee User', 'employee');

  INSERT OR IGNORE INTO Customer (name, email, phone, address) VALUES
    ('John Doe', 'customer@example.com', '555-1234', '123 Main St, Pittsburgh, PA');

  INSERT OR IGNORE INTO Job (title, description, address, date, status, price, customerId, assignedToId)
    SELECT 'Full Detail Service', 'Complete interior and exterior detailing',
           '456 Oak Ave, Pittsburgh, PA', datetime('now', '+7 days'), 'pending', 150,
           Customer.id, User.id
    FROM Customer, User
    WHERE Customer.email = 'customer@example.com' AND User.email = 'employee@example.com'
    AND NOT EXISTS (SELECT 1 FROM Job WHERE title = 'Full Detail Service');
`);

console.log('✓ Demo users and data created');
console.log('\nLogin credentials:');
console.log('Admin:    admin@example.com / admin123');
console.log('Employee: employee@example.com / emp123');

db.close();
