import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';
import { queryDb } from '@/app/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const users = await queryDb('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = (users as any[])[0] as any;

    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await compare(password, user.password);
    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set('userId', String(user.id), { httpOnly: true, path: '/' });
    cookieStore.set('userRole', user.role, { httpOnly: true, path: '/' });

    return Response.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
