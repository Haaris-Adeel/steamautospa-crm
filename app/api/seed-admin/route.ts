import { runDb, queryDb } from '@/app/lib/db';
import { hash } from 'bcryptjs';

async function seedAdmin() {
  try {
    // Hash password with bcryptjs to match login endpoint
    const password = 'SteamAutoSpa@123';
    const email = 'haarisadeel77@gmail.com';
    const passwordHash = await hash(password, 10);

    // Check if user already exists (PostgreSQL uses $1, $2, etc.)
    const existing = await queryDb('SELECT id FROM "User" WHERE id = 1');

    if ((existing as any[]).length > 0) {
      // Update existing admin user
      await runDb(
        'UPDATE "User" SET email = $1, password = $2 WHERE id = 1',
        [email, passwordHash]
      );
      return { success: true, message: 'Admin user updated successfully' };
    }

    // Create user if doesn't exist
    await runDb(
      'INSERT INTO "User" (email, password, role, name) VALUES ($1, $2, $3, $4)',
      [email, passwordHash, 'admin', 'Admin User']
    );

    return { success: true, message: 'Admin user created successfully' };
  } catch (error) {
    return { success: false, error: `Failed: ${String(error)}` };
  }
}

export async function GET() {
  const result = await seedAdmin();
  return Response.json(result);
}

export async function POST() {
  const result = await seedAdmin();
  return Response.json(result);
}
