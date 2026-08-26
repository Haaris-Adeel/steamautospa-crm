import { redirect } from 'next/navigation';
import { getCurrentUser } from './lib/auth';

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === 'admin' ? '/admin' : '/employee');
  } else {
    redirect('/login');
  }
}
