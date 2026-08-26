import { requireAdmin } from '@/app/lib/auth';
import { getGoogleAuthUrl } from '@/app/lib/googlesheets';

export async function GET() {
  try {
    await requireAdmin();
    const authUrl = getGoogleAuthUrl();
    return Response.json({ authUrl });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
