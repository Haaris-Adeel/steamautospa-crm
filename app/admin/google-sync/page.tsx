'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GoogleSettings {
  enabled: boolean;
  sheetId: string;
  lastSync: string | null;
}

export default function GoogleSyncPage() {
  const [settings, setSettings] = useState<GoogleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetId, setSheetId] = useState('');
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
      const res = await fetch('/api/settings/google');
      const data = await res.json();
      setSettings(data);
      setSheetId(data.sheetId);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/google/auth');
      const { authUrl } = await res.json();
      window.open(authUrl, 'google_auth', 'width=600,height=700');

      // Check if connected after a few seconds
      setTimeout(() => fetchSettings(), 3000);
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    }
  };

  const handleSaveSettings = async () => {
    if (!sheetId.trim()) {
      setMessage('✗ Please enter a Sheet ID');
      return;
    }

    try {
      const res = await fetch('/api/settings/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId })
      });

      if (res.ok) {
        setMessage('✓ Sheet ID saved successfully');
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
      const res = await fetch('/api/google/sync', { method: 'POST' });
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
          <h1 className="text-2xl font-bold">Google Sheets Sync</h1>
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">📊 Google Sheets Auto-Sync</h2>

          {message && (
            <div
              className={`mb-4 p-3 rounded ${
                message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          {settings?.enabled ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
                ✓ Google account is connected
              </div>

              <div>
                <label className="block font-semibold mb-2">Google Sheet ID</label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMoon9PNF5p4e9q1G2wal2DsNUL08qc"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                />
                <p className="text-sm text-gray-600 mt-1">
                  From your Google Sheet URL: docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Sheet ID
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
                Connect your Google account to auto-sync your Google Sheets bookings.
              </p>
              <button
                onClick={handleConnectGoogle}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 font-semibold"
              >
                Connect Google Account
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3">📋 Setup Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Click "Connect Google Account" above</li>
            <li>Sign in with your Google account</li>
            <li>Grant permissions to access Google Sheets</li>
            <li>Paste your Google Sheet ID (from the URL)</li>
            <li>Click "Sync Now" to test</li>
            <li>Set up automatic daily syncs (coming soon)</li>
          </ol>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Your Google Sheet should have columns:</h4>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><strong>name</strong> - Customer name</li>
              <li><strong>email</strong> - Email address</li>
              <li><strong>phone</strong> - Phone number (optional)</li>
              <li><strong>address</strong> - Service address</li>
              <li><strong>service</strong> - Type of service</li>
              <li><strong>date</strong> - Appointment date (YYYY-MM-DD or MM/DD/YYYY)</li>
              <li><strong>price</strong> - Cost</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
