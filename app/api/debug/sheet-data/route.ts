import { requireAdmin } from '@/app/lib/auth';
import { getValidAccessToken, getSetting, getGoogleSheetsData } from '@/app/lib/googlesheets';

export async function GET() {
  try {
    await requireAdmin();

    const googleEnabled = getSetting('google_sheets_enabled') === 'true';
    if (!googleEnabled) {
      return Response.json({ error: 'Google Sheets not connected' }, { status: 400 });
    }

    const refreshToken = getSetting('google_refresh_token');
    if (!refreshToken) {
      return Response.json({ error: 'Google authentication expired' }, { status: 401 });
    }

    const sheetId = getSetting('google_sheet_id');
    if (!sheetId) {
      return Response.json({ error: 'No Google Sheet ID configured' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      return Response.json({ error: 'Failed to get access token' }, { status: 401 });
    }

    const rows = await getGoogleSheetsData(sheetId, accessToken);

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No data found' }, { status: 400 });
    }

    // Return all rows with all columns so we can see the raw data
    const sampleRows = rows.slice(0, 110).map((row: any, idx: number) => ({
      rowNum: idx,
      columns: row
    }));

    const headers = rows[0] as string[];

    return Response.json({
      headers,
      headerCount: headers.length,
      totalRows: rows.length,
      sampleRows
    });
  } catch (error) {
    return Response.json({ error: `Debug failed: ${String(error)}` }, { status: 500 });
  }
}
