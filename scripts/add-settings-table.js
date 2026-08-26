const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const db = new Database(dbPath);

// Create settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS Settings (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✓ Settings table created');

// Add OneDrive settings
db.exec(`
  INSERT OR IGNORE INTO Settings (key, value) VALUES
    ('onedrive_enabled', 'false'),
    ('onedrive_file_path', ''),
    ('onedrive_sync_schedule', '0 6 * * *'),
    ('onedrive_last_sync', ''),
    ('onedrive_access_token', ''),
    ('onedrive_refresh_token', '');
`);

console.log('✓ OneDrive settings added');

db.close();
