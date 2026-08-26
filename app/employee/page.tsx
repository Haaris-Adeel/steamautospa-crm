'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Job {
  id: number;
  title: string;
  description?: string;
  address: string;
  date: string;
  status: string;
  price: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface Availability {
  id?: number;
  userId?: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface TimeOffRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  createdAt: string;
}

interface Payment {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  jobTitle?: string;
  jobDate?: string;
  customerName?: string;
}

interface PaymentStats {
  totalJobs: number;
  totalEarned: number;
  pendingAmount: number;
}

export default function EmployeeDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs');
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [acceptingJobId, setAcceptingJobId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<Availability>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [timeOffForm, setTimeOffForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    totalJobs: 0,
    totalEarned: 0,
    pendingAmount: 0,
  });
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
        setUserName(user.name);
        setLoading(false);
      } catch {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchJobs();
      fetchAvailability();
      fetchTimeOffRequests();
      fetchPayments();
    }
  }, [loading]);

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/employee/availability');
      const data = await res.json();
      if (data.id) {
        setAvailability(data);
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  };

  const fetchTimeOffRequests = async () => {
    try {
      const res = await fetch('/api/employee/timeoff');
      const data = await res.json();
      setTimeOffRequests(data);
    } catch (error) {
      console.error('Failed to fetch time off requests:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/employee/payments');
      const data = await res.json();
      setPayments(data.payments);
      setPaymentStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/employee/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const handleAcceptJob = async (jobId: number) => {
    setAcceptingJobId(jobId);
    try {
      const res = await fetch(`/api/employee/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (res.ok) {
        setJobs(jobs.map(job =>
          job.id === jobId ? { ...job, status: 'in_progress' } : job
        ));
      }
    } catch (error) {
      console.error('Failed to accept job:', error);
    } finally {
      setAcceptingJobId(null);
    }
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      const res = await fetch('/api/employee/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availability),
      });

      if (res.ok) {
        alert('Availability updated successfully!');
      }
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability');
    } finally {
      setSavingAvailability(false);
    }
  };

  const toggleDay = (day: keyof Availability) => {
    setAvailability(prev => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleSubmitTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTimeOff(true);
    try {
      const res = await fetch('/api/employee/timeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeOffForm),
      });

      if (res.ok) {
        setTimeOffForm({ startDate: '', endDate: '', reason: '' });
        await fetchTimeOffRequests();
        alert('Time off request submitted!');
      }
    } catch (error) {
      console.error('Failed to submit time off:', error);
      alert('Failed to submit request');
    } finally {
      setSubmittingTimeOff(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>
      <nav style={{ background: '#1a3a52' }} className="shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Welcome, {userName}</h1>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/login');
            }}
            style={{ background: '#B78E58' }}
            className="text-white px-4 py-2 rounded hover:opacity-90 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex gap-4 mb-6 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'jobs'
                ? 'border-b-2 text-white'
                : 'text-gray-600'
            }`}
            style={{
              borderBottomColor: activeTab === 'jobs' ? '#B78E58' : 'transparent',
              color: activeTab === 'jobs' ? '#1a3a52' : '#9CA3AF'
            }}
          >
            📅 My Jobs
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'availability'
                ? 'border-b-2'
                : ''
            }`}
            style={{
              borderBottomColor: activeTab === 'availability' ? '#B78E58' : 'transparent',
              color: activeTab === 'availability' ? '#1a3a52' : '#9CA3AF'
            }}
          >
            ⏰ Availability
          </button>
          <button
            onClick={() => setActiveTab('timeoff')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'timeoff'
                ? 'border-b-2'
                : ''
            }`}
            style={{
              borderBottomColor: activeTab === 'timeoff' ? '#B78E58' : 'transparent',
              color: activeTab === 'timeoff' ? '#1a3a52' : '#9CA3AF'
            }}
          >
            🗓️ Time Off
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'payments'
                ? 'border-b-2'
                : ''
            }`}
            style={{
              borderBottomColor: activeTab === 'payments' ? '#B78E58' : 'transparent',
              color: activeTab === 'payments' ? '#1a3a52' : '#9CA3AF'
            }}
          >
            💳 Payments
          </button>
        </div>

        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Future Bookings</h2>
                <p className="text-gray-500 text-sm mt-1">{jobs.length} upcoming job{jobs.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {jobs.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <p className="text-gray-400 text-lg">📭 No upcoming bookings</p>
                <p className="text-gray-500 text-sm mt-2">Check back soon for new assignments</p>
              </div>
            ) : (
              jobs.map((job) => {
                const jobDate = new Date(job.date);
                const now = new Date();
                const daysUntil = Math.ceil((jobDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const dateStr = jobDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const timeStr = jobDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                return (
                  <div key={job.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                    <div style={{ background: 'linear-gradient(to right, #EEF2F9, #EEE4CD)', borderLeftColor: '#B78E58' }} className="p-4 border-l-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                          {job.description && <p className="text-sm text-gray-600 mt-1">{job.description}</p>}
                        </div>
                        <div className="text-right">
                          <span className="inline-block text-white px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#B78E58' }}>
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d away`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Date & Time</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">
                            📅 {dateStr} at {timeStr}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Rate</p>
                          <p className="text-sm font-bold mt-1" style={{ color: '#B78E58' }}>
                            ${job.price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Location</p>
                        <p className="text-sm text-gray-700 mt-1">📍 {job.address}</p>
                      </div>

                      {job.customerName && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 font-semibold uppercase">Customer</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">{job.customerName}</p>
                          {job.customerPhone && (
                            <p className="text-xs text-gray-600 mt-1">☎️ {job.customerPhone}</p>
                          )}
                          {job.customerEmail && (
                            <p className="text-xs mt-1" style={{ color: '#B78E58' }}>✉️ {job.customerEmail}</p>
                          )}
                        </div>
                      )}

                      <div className="pt-3 flex gap-2">
                        {job.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleAcceptJob(job.id)}
                              disabled={acceptingJobId === job.id}
                              className="flex-1 text-white px-4 py-2 rounded hover:opacity-90 transition font-semibold text-sm disabled:opacity-50"
                              style={{ background: '#B78E58' }}
                            >
                              {acceptingJobId === job.id ? 'Accepting...' : '✓ Accept'}
                            </button>
                            <button
                              onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition font-semibold text-sm"
                            >
                              {expandedJobId === job.id ? 'Close' : 'Details'}
                            </button>
                          </>
                        ) : (
                          <div className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded text-center font-semibold text-sm">
                            Status: {job.status === 'in_progress' ? '⏳ In Progress' : '✓ Completed'}
                          </div>
                        )}
                      </div>

                      {expandedJobId === job.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Full Address</p>
                            <p className="text-sm text-gray-800 mt-1">{job.address}</p>
                          </div>
                          {job.description && (
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase">Description</p>
                              <p className="text-sm text-gray-800 mt-1">{job.description}</p>
                            </div>
                          )}
                          {job.customerName && (
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase">Full Customer Details</p>
                              <div className="text-sm text-gray-800 mt-1 space-y-1">
                                <p><strong>{job.customerName}</strong></p>
                                {job.customerEmail && <p>📧 {job.customerEmail}</p>}
                                {job.customerPhone && <p>📞 {job.customerPhone}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="bg-white p-6 rounded-lg shadow" style={{ borderTop: '4px solid #B78E58' }}>
            <h2 className="text-2xl font-bold mb-2">Set Your Availability</h2>
            <p className="text-gray-600 mb-6">Tell us which days you're available for bookings</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <label key={day} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition" style={{ borderColor: '#E5E7EB', hoverBackgroundColor: '#EEE4CD' }}>
                  <input
                    type="checkbox"
                    checked={availability[day as keyof Availability]}
                    onChange={() => toggleDay(day as keyof Availability)}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: '#B78E58' }}
                  />
                  <span className="font-semibold text-gray-700 capitalize">{day}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="text-white px-6 py-2 rounded hover:opacity-90 transition font-semibold disabled:opacity-50"
              style={{ background: '#B78E58' }}
            >
              {savingAvailability ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        )}

        {activeTab === 'timeoff' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-6">Request Time Off</h2>
              <form onSubmit={handleSubmitTimeOff} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-2 text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={timeOffForm.startDate}
                      onChange={(e) => setTimeOffForm({ ...timeOffForm, startDate: e.target.value })}
                      required
                      className="border border-gray-300 px-3 py-2 rounded w-full focus:outline-none"
                      style={{ focusBorderColor: '#B78E58' }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2 text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={timeOffForm.endDate}
                      onChange={(e) => setTimeOffForm({ ...timeOffForm, endDate: e.target.value })}
                      required
                      className="border border-gray-300 px-3 py-2 rounded w-full focus:outline-none"
                      style={{ focusBorderColor: '#B78E58' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-2 text-gray-700">Reason (Optional)</label>
                  <textarea
                    value={timeOffForm.reason}
                    onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                    placeholder="e.g., Vacation, Sick leave, Family event"
                    className="border border-gray-300 px-3 py-2 rounded w-full focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingTimeOff}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                >
                  {submittingTimeOff ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            {timeOffRequests.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-4">Your Requests</h3>
                <div className="space-y-3">
                  {timeOffRequests.map((req) => (
                    <div key={req.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                          </p>
                          {req.reason && <p className="text-sm text-gray-600 mt-1">{req.reason}</p>}
                        </div>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{
                          backgroundColor: '#EEE4CD',
                          color: '#1a3a52'
                        }}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-semibold uppercase">Total Completed</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#B78E58' }}>${paymentStats.totalEarned?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-semibold uppercase">Pending Payout</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1a3a52' }}>${paymentStats.pendingAmount?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-semibold uppercase">Total Jobs</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#B78E58' }}>{paymentStats.totalJobs || 0}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">Payment History</h3>
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payments recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Job</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-800">{payment.jobTitle || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-600">{payment.customerName || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {payment.jobDate ? new Date(payment.jobDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-800">${payment.amount.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
                              backgroundColor: payment.status === 'completed' ? '#EEE4CD' :
                                             payment.status === 'refunded' ? '#EEE4CD' :
                                             '#EEE4CD',
                              color: '#1a3a52'
                            }}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
