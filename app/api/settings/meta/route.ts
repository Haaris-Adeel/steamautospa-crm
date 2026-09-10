import { requireAdmin } from '@/app/lib/auth';
import { getSetting, setSetting } from '@/app/lib/googlesheets';

export async function GET() {
  try {
    await requireAdmin();

    const [accessToken, adAccountId, lastSync] = await Promise.all([
      getSetting('meta_access_token'),
      getSetting('meta_ad_account_id'),
      getSetting('meta_last_sync')
    ]);

    return Response.json({
      accessToken: accessToken || null,
      adAccountId: adAccountId || null,
      lastSync: lastSync || null
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { accessToken, adAccountId } = await req.json();

    if (accessToken) setSetting('meta_access_token', accessToken);
    if (adAccountId) setSetting('meta_ad_account_id', adAccountId);

    return Response.json({
      success: true,
      message: 'Meta settings updated'
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
