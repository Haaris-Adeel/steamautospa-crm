'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';

interface DashboardData {
  revenueThisWeek: number;
  revenueThisMonth: number;
  percentChange: number;
  bookingsThisWeek: number;
  jobsCompleted: number;
  expensesThisMonth: number;
  estimatedProfit: number;
  todaysJobs: any[];
  upcomingBookings: any[];
  topCustomers: any[];
  revenueByService: { [key: string]: number };
  monthlyRevenue: { [key: string]: number };
}

interface MetricsData {
  date: string;
  adSpend: number;
  leads: number;
  peopleBooked: number;
  cashCollected: number;
  dollarsBooked: number;
  costPerLead: number;
  bookingRate: number;
  avgDealSize: number;
  cashCollectionPct: number;
  bookedRoas: number;
  cashRoas: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [metricsPeriod, setMetricsPeriod] = useState('last7days');
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
      fetchDashboardData();
      fetchMetricsData(metricsPeriod);
    }
  }, [loading, metricsPeriod]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-data');
      if (!res.ok) {
        console.error('Dashboard API error:', res.status);
        return;
      }
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchMetricsData = async (period: string) => {
    try {
      const res = await fetch(`/api/metrics/fetch?period=${period}`);
      if (!res.ok) {
        console.error('Metrics API error:', res.status);
        return;
      }
      const data = await res.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics data:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/admin/clear-and-sync', { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        setSyncMessage(`✓ ${result.message}`);
        setTimeout(() => {
          fetchDashboardData();
          setSyncMessage('');
        }, 1500);
      } else {
        setSyncMessage(`✗ ${result.error}`);
      }
    } catch (error) {
      setSyncMessage('✗ Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-screen text-white">Unable to load dashboard</div>;
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = today.getHours();
  const greeting = hour >= 12 ? 'Good evening' : 'Good morning';


  return (
    <div className="flex h-screen">
      <Navigation />

      <main className="ml-64 flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', padding: '20px 32px' }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light" style={{ color: '#FFFFFF' }}>{greeting}, Haaris.</h1>
            <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>Here's how your business is doing.</p>
          </div>
          <div className="flex flex-col items-end">
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                backgroundColor: syncing ? '#475569' : '#3B82F6',
                color: '#FFFFFF',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: syncing ? 'default' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            {syncMessage && (
              <p className="text-xs mt-2" style={{ color: syncMessage.includes('✓') ? '#10B981' : '#EF4444' }}>
                {syncMessage}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Revenue Hero */}
            <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '40px' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: '#94A3B8' }}>Revenue This Week</p>
              <div className="text-6xl font-bold mt-4" style={{ color: '#FFFFFF' }}>
                ${data.revenueThisWeek.toFixed(0)}
              </div>
              <p className="text-sm mt-2" style={{ color: data.percentChange >= 0 ? '#10B981' : '#EF4444' }}>
                {data.percentChange >= 0 ? '↑' : '↓'} {Math.abs(data.percentChange)}% from last week
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '20px' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>BOOKINGS</p>
                <p className="text-3xl font-bold mt-3" style={{ color: '#FFFFFF' }}>{data.bookingsThisWeek}</p>
              </div>
              <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '20px' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>COMPLETED</p>
                <p className="text-3xl font-bold mt-3" style={{ color: '#FFFFFF' }}>{data.jobsCompleted}</p>
              </div>
              <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '20px' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>THIS MONTH</p>
                <p className="text-3xl font-bold mt-3" style={{ color: '#FFFFFF' }}>${data.revenueThisMonth.toFixed(0)}</p>
              </div>
              <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '20px' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>PROFIT</p>
                <p className="text-3xl font-bold mt-3" style={{ color: '#FFFFFF' }}>${data.estimatedProfit.toFixed(0)}</p>
              </div>
            </div>

            {/* Today's Schedule & Upcoming Bookings */}
            <div className="grid grid-cols-2 gap-4">
              {/* Today's Schedule */}
              <div>
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>Today's Schedule</p>
                <div className="space-y-1">
                  {data.todaysJobs.slice(0, 3).map((job) => {
                    const jobDate = new Date(job.date);
                    const isValidDate = !isNaN(jobDate.getTime());
                    const jobTime = isValidDate
                      ? jobDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : 'TBD';
                    return (
                      <div key={job.id} style={{ backgroundColor: '#1E293B', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }}>
                        <div style={{ color: '#FFFFFF' }}>{jobTime} — {job.customerName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div>
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>Upcoming Bookings</p>
                <div className="space-y-1">
                  {data.upcomingBookings.slice(0, 3).map((booking) => {
                    const bookingDate = new Date(booking.date);
                    const dayStr = bookingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const timeStr = bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={booking.id} style={{ backgroundColor: '#1E293B', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }}>
                        <div style={{ color: '#FFFFFF' }}>{dayStr} {timeStr}</div>
                        <div style={{ color: '#94A3B8', fontSize: '12px' }}>{booking.customerName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Marketing Metrics */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs uppercase tracking-wider" style={{ color: '#94A3B8' }}>Marketing Metrics</p>
                <div className="flex gap-2">
                  {(['last7days', 'thisMonth', 'allTime'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setMetricsPeriod(period)}
                      style={{
                        backgroundColor: metricsPeriod === period ? '#3B82F6' : '#1E293B',
                        color: metricsPeriod === period ? '#FFFFFF' : '#94A3B8',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {period === 'last7days' ? 'Last 7 Days' : period === 'thisMonth' ? 'This Month' : 'All Time'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>Ad Spend</p>
                  <p style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold' }}>${metrics ? metrics.adSpend : '0'}</p>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Last 7 Days</p>
                </div>
                <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>Leads</p>
                  <p style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold' }}>{metrics ? metrics.leads : '0'}</p>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Last 7 Days</p>
                </div>
                <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>Booked</p>
                  <p style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold' }}>{metrics ? metrics.peopleBooked : '0'}</p>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>People Booked</p>
                </div>
                <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>ROAS</p>
                  <p style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold' }}>{metrics && metrics.bookedRoas ? metrics.bookedRoas.toFixed(2) + 'x' : '—'}</p>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Return on Ad Spend</p>
                </div>
                <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>Booking Rate</p>
                  <p style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold' }}>{metrics && metrics.bookingRate ? metrics.bookingRate.toFixed(1) + '%' : '—'}</p>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Conversion Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: '#1E293B', borderRadius: '6px', padding: '16px' }}>
      <p className="text-xs" style={{ color: '#94A3B8' }}>{label}</p>
      <p className="text-lg font-semibold mt-2" style={{ color: '#FFFFFF' }}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '4px', padding: '16px' }}>
      <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
      <p className="text-lg font-semibold mt-2" style={{ color: '#111827' }}>{value}</p>
    </div>
  );
}

function getStatusBg(status: string): string {
  const colors: { [key: string]: string } = {
    pending: '#C48A32',
    completed: '#2F7D5A',
    scheduled: '#1a3a52',
    in_progress: '#D97706',
    cancelled: '#B94A48',
  };
  return colors[status] || '#6B7280';
}

function getStatusText(status: string): string {
  return '#FFFFFF';
}
