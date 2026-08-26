import { requireAdmin } from '@/app/lib/auth';
import { getOneDriveAuthUrl } from '@/app/lib/onedrive';

export async function GET() {
  try {
    await requireAdmin();
    const authUrl = getOneDriveAuthUrl();
    return Response.json({ authUrl });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
