async function checkSheets() {
  try {
    // Load settings from database
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    const db = new Database(dbPath, { readonly: true });

    const getSettingSync = (key) => {
      const result = db.prepare('SELECT value FROM Settings WHERE key = ?').get(key);
      return result?.value || null;
    };

    const googleEnabled = getSettingSync('google_sheets_enabled') === 'true';
    const refreshToken = getSettingSync('google_refresh_token');
    const sheetId = getSettingSync('google_sheet_id');

    if (!googleEnabled || !refreshToken || !sheetId) {
      console.log('Google Sheets not configured');
      db.close();
      return;
    }

    console.log('Sheet ID:', sheetId);

    // Get fresh access token
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = await response.json();
    const accessToken = data.access_token;

    // Fetch Phase II rows 110-125
    const encodedRange = encodeURIComponent(`'Phase II'!A110:H125`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;

    console.log('Fetching from URL:', url.substring(0, 100) + '...');

    const sheetResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!sheetResponse.ok) {
      const errorText = await sheetResponse.text();
      console.log('Error response:', sheetResponse.status, errorText);
      db.close();
      return;
    }

    const sheetData = await sheetResponse.json();
    console.log('Response keys:', Object.keys(sheetData));
    console.log('Rows 110-125 from Google Sheets Phase II:');
    if (sheetData.values) {
      sheetData.values.forEach((row, idx) => {
        console.log(`Row ${110 + idx}: ${JSON.stringify(row.slice(0, 3))}`);
      });
    } else {
      console.log('No values in response');
    }

    db.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSheets();
