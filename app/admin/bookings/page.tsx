'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';

interface Booking {
  id: number;
  title: string;
  customerName: string;
  address: string;
  date: string;
  price: number;
  status: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const user = await res.json();
        if (user.role !== 'admin') {
          router.push('/employee');
        }
        setLoading(false);
      } catch {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchBookings();
    }
  }, [loading]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-data');
      const data = await res.json();
      // Combine today's jobs and upcoming bookings
      const allBookings = [...(data.todaysJobs || []), ...(data.upcomingBookings || [])];
      setBookings(allBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <Navigation />

      <main className="ml-64 flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
        <div style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', padding: '20px 32px' }}>
          <h1 className="text-3xl font-light" style={{ color: '#FFFFFF' }}>Bookings</h1>
          <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>View all your bookings and manage them</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div style={{ backgroundColor: '#1E293B', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #475569' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '500' }}>Customer</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '500' }}>Service</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '500' }}>Address</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '500' }}>Price</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '500' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const bookingDate = new Date(booking.date);
                  const dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                  const statusBg = booking.status === 'completed' ? '#2F7D5A' : booking.status === 'pending' ? '#C48A32' : '#475569';

                  return (
                    <tr key={booking.id} style={{ borderBottom: '1px solid #475569' }}>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{dateStr} {timeStr}</td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{booking.customerName}</td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{booking.title}</td>
                      <td style={{ padding: '16px', color: '#94A3B8' }}>{booking.address}</td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>${booking.price?.toFixed(2)}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ backgroundColor: statusBg, color: '#FFFFFF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
