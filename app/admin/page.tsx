'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/dashboard');
  }, [router]);

  return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;
}
