'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GoogleSettings {
  enabled: boolean;
  sheetId: string;
  lastSync: string | null;
  metricsSheetId: string;
  metricsLastSync: string | null;
  bookingsSheetId: string;
  bookingsLastSync: string | null;
  bookingsEnabled: boolean;
}

export default function SettingsPage() {
  const [googleSettings, setGoogleSettings] = useState<GoogleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsSheetId, setMetricsSheetId] = useState('');
  const [bookingsSheetId, setBookingsSheetId] = useState('');
  const [message, setMessage] = useState('');
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
        await fetchGoogleSettings();
        setLoading(false);
      } catch {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchGoogleSettings = async () => {
    try {
      const res = await fetch('/api/settings/google');
      const data = await res.json();
      setGoogleSettings(data);
      setMetricsSheetId(data.metricsSheetId || '');
      setBookingsSheetId(data.bookingsSheetId || '');
    } catch (error) {
      console.error('Failed to fetch google settings:', error);
    }
  };

  const handleSaveMetricsSheetId = async () => {
    if (!metricsSheetId.trim()) {
      setMessage('✗ Please enter a Sheet ID');
      return;
    }

    try {
      const res = await fetch('/api/settings/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricsSheetId })
      });

      if (res.ok) {
        setMessage('✓ Metrics sheet ID saved successfully');
        await fetchGoogleSettings();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('✗ Failed to save metrics sheet ID');
      }
    } catch (error) {
      setMessage(`✗ Error: ${String(error)}`);
    }
  };

  const handleMetricsSync = async () => {
    try {
      const res = await fetch('/api/metrics/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setMessage(`✓ ${data.message}`);
        await fetchGoogleSettings();
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(`✗ ${data.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${String(error)}`);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/google/auth');
      const { authUrl } = await res.json();
      window.open(authUrl, 'google_auth', 'width=600,height=700');
    } catch (error) {
      setMessage(`✗ Error: ${String(error)}`);
    }
  };

  const handleSaveBookingsSheetId = async () => {
    if (!bookingsSheetId.trim()) {
      setMessage('✗ Please enter a Sheet ID');
      return;
    }

    try {
      const res = await fetch('/api/settings/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingsSheetId, bookingsEnabled: true })
      });

      if (res.ok) {
        setMessage('✓ Bookings sheet ID saved. Sync will start automatically every 30 minutes.');
        await fetchGoogleSettings();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('✗ Failed to save bookings sheet ID');
      }
    } catch (error) {
      setMessage(`✗ Error: ${String(error)}`);
    }
  };

  const handleBookingsSync = async () => {
    try {
      const res = await fetch('/api/admin/clear-and-sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setMessage(`✓ ${data.message}`);
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(`✗ ${data.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${String(error)}`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Settings</h1>
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-8">
        {message && (
          <div className={`mb-4 p-3 rounded ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* Google Metrics Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">📊 Google Sheets Metrics Sync</h2>

          {googleSettings?.metricsSheetId ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
                ✓ Metrics sheet is configured
              </div>

              <div>
                <label className="block font-semibold mb-2">Metrics Sheet ID</label>
                <input
                  type="text"
                  value={metricsSheetId}
                  onChange={(e) => setMetricsSheetId(e.target.value)}
                  placeholder="186odXNt47LddBzra8SteMAs3cMNBBwq7ehU8g_hLzmw"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                />
                <p className="text-sm text-gray-600 mt-1">
                  From your Google Sheet URL: docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveMetricsSheetId}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Sheet ID
                </button>
                <button
                  onClick={handleMetricsSync}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Sync Metrics Now
                </button>
              </div>

              {googleSettings?.metricsLastSync && (
                <div className="text-sm text-gray-600">
                  Last synced: {new Date(googleSettings.metricsLastSync).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                Configure your Daily Metrics Tracker sheet to sync marketing metrics automatically.
              </p>
              <div>
                <label className="block font-semibold mb-2">Metrics Sheet ID</label>
                <input
                  type="text"
                  value={metricsSheetId}
                  onChange={(e) => setMetricsSheetId(e.target.value)}
                  placeholder="186odXNt47LddBzra8SteMAs3cMNBBwq7ehU8g_hLzmw"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                />
              </div>
              <button
                onClick={handleSaveMetricsSheetId}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 font-semibold"
              >
                Save Metrics Sheet ID
              </button>
            </div>
          )}
        </div>

        {/* Google Sheets Bookings Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">📗 Google Sheets Bookings Sync</h2>

          {googleSettings?.bookingsEnabled ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
                ✓ Bookings sheet is configured. Auto-sync runs every 30 minutes.
              </div>

              <div>
                <label className="block font-semibold mb-2">Bookings Sheet ID</label>
                <input
                  type="text"
                  value={bookingsSheetId}
                  onChange={(e) => setBookingsSheetId(e.target.value)}
                  placeholder="186odXNt47LddBzra8SteMAs3cMNBBwq7ehU8g_hLzmw"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                />
                <p className="text-sm text-gray-600 mt-1">
                  From your Google Sheet URL: docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveBookingsSheetId}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Sheet ID
                </button>
                <button
                  onClick={handleBookingsSync}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Sync Now
                </button>
              </div>

              {googleSettings?.bookingsLastSync && (
                <div className="text-sm text-gray-600">
                  Last synced: {new Date(googleSettings.bookingsLastSync).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                Connect your Google account and configure your Bookings spreadsheet to automatically sync jobs every 30 minutes.
              </p>
              <button
                onClick={handleConnectGoogle}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 font-semibold"
              >
                Connect Google Account
              </button>

              {googleSettings?.enabled && (
                <div>
                  <label className="block font-semibold mb-2">Bookings Sheet ID</label>
                  <input
                    type="text"
                    value={bookingsSheetId}
                    onChange={(e) => setBookingsSheetId(e.target.value)}
                    placeholder="186odXNt47LddBzra8SteMAs3cMNBBwq7ehU8g_hLzmw"
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                  />
                  <button
                    onClick={handleSaveBookingsSheetId}
                    className="mt-3 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 font-semibold"
                  >
                    Save Bookings Sheet ID
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">📋 Google Sheets Column Requirements</h3>
          <p className="text-sm text-blue-800 mb-2">Your Google Sheets should have these columns for bookings:</p>
          <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li><strong>name</strong> or <strong>Customer Name</strong> - Customer name</li>
            <li><strong>email</strong> or <strong>Email</strong> - Customer email</li>
            <li><strong>phone</strong> or <strong>Phone Number</strong> - Customer phone (optional)</li>
            <li><strong>address</strong> or <strong>Address</strong> - Service address</li>
            <li><strong>service</strong> or <strong>Service</strong> - Type of service</li>
            <li><strong>date</strong> or <strong>Date</strong> - Appointment date</li>
            <li><strong>charges</strong> or <strong>price</strong> - Service price</li>
          </ul>
          <p className="text-sm text-blue-800 mt-4">Both sheets sync automatically every 30 minutes</p>
        </div>
      </div>
    </div>
  );
}
