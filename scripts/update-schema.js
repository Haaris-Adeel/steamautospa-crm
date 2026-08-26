const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Updating database schema...\n');

// Create Vehicles table
db.exec(`
  CREATE TABLE IF NOT EXISTS Vehicle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER NOT NULL,
    year INTEGER,
    make TEXT,
    model TEXT,
    color TEXT,
    vehicleType TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES Customer(id)
  );
`);
console.log('✓ Vehicles table created');

// Create Services table
db.exec(`
  CREATE TABLE IF NOT EXISTS Service (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serviceName TEXT NOT NULL,
    vehicleCategory TEXT,
    price REAL,
    estimatedDuration REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('✓ Services table created');

// Create Expenses table
db.exec(`
  CREATE TABLE IF NOT EXISTS Expense (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATETIME NOT NULL,
    category TEXT,
    vendor TEXT,
    description TEXT,
    amount REAL,
    employeeId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES User(id)
  );
`);
console.log('✓ Expenses table created');

// Add missing columns to Job if they don't exist
const jobTableInfo = db.prepare("PRAGMA table_info(Job)").all();
const jobColumns = jobTableInfo.map(col => col.name);

if (!jobColumns.includes('vehicleId')) {
  db.exec(`ALTER TABLE Job ADD COLUMN vehicleId INTEGER;`);
  console.log('✓ Added vehicleId to Job table');
}

if (!jobColumns.includes('serviceId')) {
  db.exec(`ALTER TABLE Job ADD COLUMN serviceId INTEGER;`);
  console.log('✓ Added serviceId to Job table');
}

if (!jobColumns.includes('paymentStatus')) {
  db.exec(`ALTER TABLE Job ADD COLUMN paymentStatus TEXT DEFAULT 'unpaid';`);
  console.log('✓ Added paymentStatus to Job table');
}

if (!jobColumns.includes('startTime')) {
  db.exec(`ALTER TABLE Job ADD COLUMN startTime TEXT;`);
  console.log('✓ Added startTime to Job table');
}

if (!jobColumns.includes('endTime')) {
  db.exec(`ALTER TABLE Job ADD COLUMN endTime TEXT;`);
  console.log('✓ Added endTime to Job table');
}

if (!jobColumns.includes('estimatedDuration')) {
  db.exec(`ALTER TABLE Job ADD COLUMN estimatedDuration REAL;`);
  console.log('✓ Added estimatedDuration to Job table');
}

// Add missing columns to Customer if they don't exist
const customerTableInfo = db.prepare("PRAGMA table_info(Customer)").all();
const customerColumns = customerTableInfo.map(col => col.name);

if (!customerColumns.includes('leadSource')) {
  db.exec(`ALTER TABLE Customer ADD COLUMN leadSource TEXT;`);
  console.log('✓ Added leadSource to Customer table');
}

if (!customerColumns.includes('notes')) {
  db.exec(`ALTER TABLE Customer ADD COLUMN notes TEXT;`);
  console.log('✓ Added notes to Customer table');
}

// Create default services
const existingServices = db.prepare('SELECT COUNT(*) as count FROM Service').get();
if (existingServices.count === 0) {
  db.exec(`
    INSERT INTO Service (serviceName, vehicleCategory, price, estimatedDuration) VALUES
    ('Full Detail', 'all', 245, 3.5),
    ('Interior Detail', 'all', 190, 2.5),
    ('Exterior Detail', 'all', 150, 1.5),
    ('Interior + Exterior', 'all', 350, 4.0);
  `);
  console.log('✓ Default services created');
}

console.log('\n✨ Database schema updated successfully!');
db.close();
