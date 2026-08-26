import { requireAdmin } from '@/app/lib/auth';
import { getSetting, setSetting } from '@/app/lib/googlesheets';

export async function GET() {
  try {
    await requireAdmin();

    return Response.json({
      enabled: getSetting('google_sheets_enabled') === 'true',
      sheetId: getSetting('google_sheet_id') || '',
      lastSync: getSetting('google_last_sync') || null
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { sheetId, enabled } = await req.json();

    if (sheetId) setSetting('google_sheet_id', sheetId);
    if (enabled !== undefined) setSetting('google_sheets_enabled', enabled ? 'true' : 'false');

    return Response.json({
      success: true,
      message: 'Settings updated'
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
