import { runDb, queryDb } from '@/app/lib/db';
import { hash } from 'bcryptjs';

async function seedAdmin() {
  try {
    // Hash password with bcryptjs to match login endpoint
    const password = 'admin123';
    const passwordHash = await hash(password, 10);

    // Check if user already exists (PostgreSQL uses $1, $2, etc.)
    const existing = await queryDb('SELECT id FROM "User" WHERE email = $1', ['admin@example.com']);

    if ((existing as any[]).length > 0) {
      return { success: true, message: 'User already exists' };
    }

    // Create user
    await runDb(
      'INSERT INTO "User" (email, password, role, name) VALUES ($1, $2, $3, $4)',
      ['admin@example.com', passwordHash, 'admin', 'Admin User']
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
