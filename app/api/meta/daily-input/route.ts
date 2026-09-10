import { requireAdmin } from '@/app/lib/auth';
import { runDb, queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const today = new Date().toISOString().split('T')[0];

    const result = await queryDb(
      'SELECT "dollarsBooked", "cashCollected" FROM "MetaMetricsSnapshot" WHERE period = $1',
      [`daily_${today}`]
    );

    if (result.length > 0) {
      return Response.json({
        dollarsBooked: (result[0] as any).dollarsBooked || 0,
        cashCollected: (result[0] as any).cashCollected || 0
      });
    }

    return Response.json({ dollarsBooked: 0, cashCollected: 0 });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { dollarsBooked, cashCollected } = await req.json();
    const today = new Date().toISOString().split('T')[0];

    await runDb(
      `INSERT INTO "MetaMetricsSnapshot" (period, "dollarsBooked", "cashCollected", spend, leads)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (period) DO UPDATE SET
       "dollarsBooked" = $2, "cashCollected" = $3, updated_at = CURRENT_TIMESTAMP`,
      [`daily_${today}`, parseFloat(dollarsBooked || '0'), parseFloat(cashCollected || '0')]
    );

    return Response.json({ success: true, message: 'Daily bookings saved' });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
