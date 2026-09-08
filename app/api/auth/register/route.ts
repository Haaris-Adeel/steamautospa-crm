import { hash } from 'bcryptjs';
import { queryDb, runDb } from '@/app/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password || !name) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existing = await queryDb('SELECT id FROM User WHERE email = ?', [email]);
    if (existing.length > 0) {
      return Response.json({ error: 'User exists' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    const result = await runDb(
      'INSERT INTO User (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, role === 'admin' ? 'admin' : 'employee']
    );

    return Response.json({
      message: 'User created',
      user: { id: result.lastInsertRowid, email, name, role: role === 'admin' ? 'admin' : 'employee' }
    });
  } catch (error) {
    console.error('Register error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
