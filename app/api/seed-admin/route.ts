import { runDb, queryDb } from '@/app/lib/db';
import { hash } from 'bcryptjs';

export async function POST() {
  try {
    // Hash password with bcryptjs to match login endpoint
    const password = 'SteamAutoSpa@123';
    const passwordHash = await hash(password, 10);

    // Check if user already exists
    const existing = await queryDb('SELECT id FROM User WHERE email = ?', ['haarisadeel77@gmail.com']);

    if (existing.length > 0) {
      return Response.json({ message: 'User already exists' }, { status: 400 });
    }

    // Create user
    await runDb(
      'INSERT INTO User (email, password, role, name) VALUES (?, ?, ?, ?)',
      ['haarisadeel77@gmail.com', passwordHash, 'admin', 'Haaris Adeel']
    );

    return Response.json({ message: 'Admin user created successfully' });
  } catch (error) {
    return Response.json({ error: `Failed: ${String(error)}` }, { status: 500 });
  }
}
