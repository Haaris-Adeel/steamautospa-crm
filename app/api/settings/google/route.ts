import { requireAdmin } from '@/app/lib/auth';
import { getSetting, setSetting } from '@/app/lib/googlesheets';

export async function GET() {
  try {
    await requireAdmin();

    const [enabled, sheetId, lastSync, metricsSheetId, metricsLastSync, bookingsSheetId, bookingsLastSync] = await Promise.all([
      getSetting('google_sheets_enabled'),
      getSetting('google_sheet_id'),
      getSetting('google_last_sync'),
      getSetting('metrics_sheet_id'),
      getSetting('metrics_last_sync'),
      getSetting('google_sheet_id'),
      getSetting('google_last_sync')
    ]);

    return Response.json({
      enabled: enabled === 'true',
      sheetId: sheetId || '',
      lastSync: lastSync || null,
      metricsSheetId: metricsSheetId || '',
      metricsLastSync: metricsLastSync || null,
      bookingsSheetId: bookingsSheetId || '',
      bookingsLastSync: bookingsLastSync || null,
      bookingsEnabled: enabled === 'true'
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
