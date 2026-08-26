'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Job {
  id: number;
  title: string;
  address: string;
  date: string;
  price: number;
  status: string;
  customer?: { name: string; email: string; phone: string };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, completed
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
      fetchJobs();
    }
  }, [loading]);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/admin/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const handleStatusChange = async (jobId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setJobs(jobs.map(job => job.id === jobId ? { ...job, status: newStatus } : job));
      }
    } catch (error) {
      console.error('Failed to update job:', error);
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const totalRevenue = jobs
    .filter(j => j.status === 'completed')
    .reduce((sum, j) => sum + (j.price || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Jobs Management</h1>
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Total Jobs</div>
            <div className="text-3xl font-bold text-blue-600">{jobs.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">{pendingJobs}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Completed</div>
            <div className="text-3xl font-bold text-green-600">{completedJobs}</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded font-semibold ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded font-semibold ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Pending ({pendingJobs})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded font-semibold ${
              filter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Completed ({completedJobs})
          </button>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Date</th>
                <th className="px-6 py-3 text-left font-semibold">Service</th>
                <th className="px-6 py-3 text-left font-semibold">Address</th>
                <th className="px-6 py-3 text-left font-semibold">Customer</th>
                <th className="px-6 py-3 text-left font-semibold">Price</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">{new Date(job.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold">{job.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{job.address}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{job.customer?.name}</div>
                    <div className="text-xs text-gray-500">{job.customer?.phone}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold">${job.price}</td>
                  <td className="px-6 py-4">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      className={`px-3 py-1 rounded text-sm font-semibold cursor-pointer ${
                        job.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredJobs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {filter !== 'all' ? filter : ''} jobs found
            </div>
          )}
        </div>

        {/* Revenue Summary */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-bold mb-4">💰 Revenue from Completed Jobs</h2>
          <div className="text-4xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
          <p className="text-gray-600 mt-2">{completedJobs} jobs completed</p>
        </div>
      </div>
    </div>
  );
}
