import { queryDb, runDb } from './db';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

export function getGoogleAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = (await response.json()) as any;

  return {
    accessToken: data.access_token || '',
    refreshToken: data.refresh_token || '',
    expiresIn: data.expires_in || 0
  };
}

export async function getValidAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = (await response.json()) as any;
  return data.access_token || '';
}

export function getSetting(key: string): string | null {
  const result = queryDb('SELECT value FROM Settings WHERE key = ?', [key]);
  return (result[0] as any)?.value || null;
}

export function setSetting(key: string, value: string) {
  runDb('INSERT OR REPLACE INTO Settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, value]);
}

export async function getGoogleSheetsData(sheetId: string, accessToken: string, sheetName: string = 'Phase II') {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:Z`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet "${sheetName}": ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.values || [];
}
