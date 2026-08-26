'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OneDriveSettings {
  enabled: boolean;
  filePath: string;
  syncSchedule: string;
  lastSync: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<OneDriveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filePath, setFilePath] = useState('');
  const [syncSchedule, setSyncSchedule] = useState('0 6 * * *');
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
        await fetchSettings();
        setLoading(false);
      } catch {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/onedrive');
      const data = await res.json();
      setSettings(data);
      setFilePath(data.filePath);
      setSyncSchedule(data.syncSchedule);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleConnectOneDrive = async () => {
    try {
      const res = await fetch('/api/onedrive/auth');
      const { authUrl } = await res.json();
      window.open(authUrl, 'onedrive_auth', 'width=600,height=700');
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/settings/onedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, syncSchedule })
      });

      if (res.ok) {
        setMessage('✓ Settings saved successfully');
        await fetchSettings();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('✗ Failed to save settings');
      }
    } catch (error) {
      setMessage(`✗ Error: ${String(error)}`);
    }
  };

  const handleManualSync = async () => {
    try {
      const res = await fetch('/api/onedrive/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setMessage(`✓ ${data.message}`);
        await fetchSettings();
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
        {/* OneDrive Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">☁️ OneDrive Sync Setup</h2>

          {message && (
            <div className={`mb-4 p-3 rounded ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          {settings?.enabled ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
                ✓ OneDrive is connected
              </div>

              <div>
                <label className="block font-semibold mb-2">File Path in OneDrive</label>
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/Bookings.xlsx"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Example: /Bookings.xlsx or /Documents/Customers.xlsx
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-2">Sync Schedule (Cron Format)</label>
                <input
                  type="text"
                  value={syncSchedule}
                  onChange={(e) => setSyncSchedule(e.target.value)}
                  placeholder="0 6 * * *"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Current: Every day at 6:00 AM (0 6 * * *)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Settings
                </button>
                <button
                  onClick={handleManualSync}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Sync Now
                </button>
              </div>

              {settings?.lastSync && (
                <div className="text-sm text-gray-600">
                  Last synced: {new Date(settings.lastSync).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                Connect your OneDrive account to automatically sync your bookings Excel file daily.
              </p>
              <button
                onClick={handleConnectOneDrive}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 font-semibold"
              >
                Connect OneDrive
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">📋 Excel Column Requirements</h3>
          <p className="text-sm text-blue-800 mb-2">Your Excel file should have these columns:</p>
          <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li><strong>name</strong> or <strong>Customer Name</strong> - Customer name</li>
            <li><strong>email</strong> or <strong>Email</strong> - Customer email</li>
            <li><strong>phone</strong> or <strong>Phone Number</strong> - Customer phone (optional)</li>
            <li><strong>address</strong> or <strong>Address</strong> - Service address</li>
            <li><strong>service</strong> or <strong>Service</strong> - Type of service</li>
            <li><strong>date</strong> or <strong>Date</strong> - Appointment date</li>
            <li><strong>price</strong> or <strong>amount</strong> - Service price</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
