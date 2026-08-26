'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';

interface Booking {
  id: number;
  title: string;
  customerName: string;
  date: string;
  status: string;
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
      const allBookings = [...(data.todaysJobs || []), ...(data.upcomingBookings || [])];
      setBookings(allBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getBookingsForDate = (day: number) => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      return (
        bookingDate.getDate() === day &&
        bookingDate.getMonth() === currentMonth.getMonth() &&
        bookingDate.getFullYear() === currentMonth.getFullYear()
      );
    });
  };

  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <Navigation />

      <main className="ml-64 flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
        <div style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', padding: '20px 32px' }}>
          <h1 className="text-3xl font-light" style={{ color: '#FFFFFF' }}>Calendar</h1>
          <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>View your bookings by date</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '24px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '600' }}>{monthName}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  style={{
                    backgroundColor: '#475569',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Next →
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#0F172A', padding: '1px', borderRadius: '8px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  style={{
                    backgroundColor: '#475569',
                    color: '#94A3B8',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: '600'
                  }}
                >
                  {day}
                </div>
              ))}

              {emptyDays.map((i) => (
                <div
                  key={`empty-${i}`}
                  style={{
                    backgroundColor: '#0F172A',
                    padding: '12px'
                  }}
                />
              ))}

              {days.map((day) => {
                const dayBookings = getBookingsForDate(day);
                return (
                  <div
                    key={day}
                    style={{
                      backgroundColor: '#1E293B',
                      padding: '12px',
                      minHeight: '120px',
                      borderRadius: '4px',
                      border: '1px solid #475569'
                    }}
                  >
                    <div style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '8px' }}>{day}</div>
                    <div style={{ fontSize: '12px' }}>
                      {dayBookings.map((booking) => (
                        <div
                          key={booking.id}
                          style={{
                            backgroundColor: booking.status === 'completed' ? '#2F7D5A' : '#C48A32',
                            color: '#FFFFFF',
                            padding: '4px 6px',
                            borderRadius: '3px',
                            marginBottom: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={`${booking.customerName} - ${booking.title}`}
                        >
                          {booking.customerName}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
