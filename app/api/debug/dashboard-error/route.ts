import { requireAdmin } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    await requireAdmin();

    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysStr = last7Days.toISOString().split('T')[0];

    // Try the first query to see the exact error
    console.log('Testing query with params:', [last7DaysStr]);
    const result = await queryDb(
      `SELECT COALESCE(SUM(price), 0) as total FROM "Job"
       WHERE DATE("date") >= $1::date AND status = 'completed'`,
      [last7DaysStr]
    );

    return Response.json({ success: true, result, params: [last7DaysStr] });
  } catch (error: any) {
    console.error('Dashboard debug error:', error);
    return Response.json({
      success: false,
      error: String(error),
      message: error?.message,
      code: error?.code
    }, { status: 500 });
  }
}
