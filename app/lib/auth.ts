import { cookies } from 'next/headers';
import { queryDb } from './db';

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) return null;

    const users = queryDb('SELECT id, email, name, role FROM User WHERE id = ?', [parseInt(userId)]);
    return users[0] || null;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if ((user as any).role !== 'admin') {
    throw new Error('Not authorized');
  }
  return user;
}
