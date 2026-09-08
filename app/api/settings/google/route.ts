import { requireAdmin } from '@/app/lib/auth';
import { getSetting, setSetting } from '@/app/lib/googlesheets';

export async function GET() {
  try {
    await requireAdmin();

    return Response.json({
      enabled: getSetting('google_sheets_enabled') === 'true',
      sheetId: getSetting('google_sheet_id') || '',
      lastSync: getSetting('google_last_sync') || null,
      metricsSheetId: getSetting('metrics_sheet_id') || '',
      metricsLastSync: getSetting('metrics_last_sync') || null,
      bookingsSheetId: getSetting('google_sheet_id') || '',
      bookingsLastSync: getSetting('google_last_sync') || null,
      bookingsEnabled: getSetting('google_sheets_enabled') === 'true'
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { sheetId, metricsSheetId, bookingsSheetId, enabled, bookingsEnabled } = await req.json();

    if (sheetId) setSetting('google_sheet_id', sheetId);
    if (metricsSheetId) setSetting('metrics_sheet_id', metricsSheetId);
    if (bookingsSheetId) setSetting('google_sheet_id', bookingsSheetId);
    if (enabled !== undefined) setSetting('google_sheets_enabled', enabled ? 'true' : 'false');
    if (bookingsEnabled !== undefined) setSetting('google_sheets_enabled', bookingsEnabled ? 'true' : 'false');

    return Response.json({
      success: true,
      message: 'Settings updated'
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
