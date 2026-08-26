import { requireAdmin } from '@/app/lib/auth';
import { getSetting, setSetting } from '@/app/lib/onedrive';

export async function GET() {
  try {
    await requireAdmin();

    return Response.json({
      enabled: getSetting('onedrive_enabled') === 'true',
      filePath: getSetting('onedrive_file_path') || '',
      syncSchedule: getSetting('onedrive_sync_schedule') || '0 6 * * *',
      lastSync: getSetting('onedrive_last_sync') || null
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { filePath, syncSchedule, enabled } = await req.json();

    if (filePath) setSetting('onedrive_file_path', filePath);
    if (syncSchedule) setSetting('onedrive_sync_schedule', syncSchedule);
    if (enabled !== undefined) setSetting('onedrive_enabled', enabled ? 'true' : 'false');

    return Response.json({
      success: true,
      message: 'Settings updated'
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
