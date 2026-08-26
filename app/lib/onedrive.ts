import { queryDb, runDb } from './db';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || 'YOUR_CLIENT_ID';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/api/onedrive/callback';

export function getOneDriveAuthUrl() {
  const scopes = ['Files.Read', 'offline_access'];
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: 'code',
    scope: scopes.join(' '),
    redirect_uri: REDIRECT_URI,
    prompt: 'select_account'
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = (await response.json()) as any;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = (await response.json()) as any;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in
  };
}

export function getSetting(key: string): string | null {
  const result = queryDb('SELECT value FROM Settings WHERE key = ?', [key]);
  return (result[0] as any)?.value || null;
}

export function setSetting(key: string, value: string) {
  runDb('UPDATE Settings SET value = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?', [value, key]);
}

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = getSetting('onedrive_access_token');
  const refreshToken = getSetting('onedrive_refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  try {
    const { accessToken: newToken, refreshToken: newRefreshToken } = await refreshAccessToken(refreshToken);
    setSetting('onedrive_access_token', newToken);
    setSetting('onedrive_refresh_token', newRefreshToken);
    return newToken;
  } catch {
    return null;
  }
}
