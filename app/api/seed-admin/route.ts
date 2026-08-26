import { runDb, queryDb } from '@/app/lib/db';
import crypto from 'crypto';

export async function POST() {
  try {
    // Hash password with sha256 for now (simple approach)
    const password = 'SteamAutoSpa@123';
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // Check if user already exists
    const existing = queryDb('SELECT id FROM User WHERE email = ?', ['haarisadeel77@gmail.com']);

    if (existing.length > 0) {
      return Response.json({ message: 'User already exists' }, { status: 400 });
    }

    // Create user
    runDb(
      'INSERT INTO User (email, passwordHash, role, name) VALUES (?, ?, ?, ?)',
      ['haarisadeel77@gmail.com', passwordHash, 'admin', 'Haaris Adeel']
    );

    return Response.json({ message: 'Admin user created successfully' });
  } catch (error) {
    return Response.json({ error: `Failed: ${String(error)}` }, { status: 500 });
  }
}
