import { requireAuth } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    const user = await requireAuth() as any;

    if (user.role !== 'employee') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payments = await queryDb(
      `SELECT
        Payment.id,
        Payment.amount,
        Payment.status,
        Payment.createdAt,
        Job.title as jobTitle,
        Job.date as jobDate,
        Customer.name as customerName
       FROM Payment
       LEFT JOIN Job ON Payment.jobId = Job.id
       LEFT JOIN Customer ON Job.customerId = Customer.id
       WHERE Payment.userId = ?
       ORDER BY Payment.createdAt DESC`,
      [user.id]
    );

    const stats = await queryDb(
      `SELECT
        COUNT(*) as totalJobs,
        SUM(CASE WHEN Payment.status = 'completed' THEN Payment.amount ELSE 0 END) as totalEarned,
        SUM(CASE WHEN Payment.status = 'pending' THEN Payment.amount ELSE 0 END) as pendingAmount
       FROM Payment
       WHERE Payment.userId = ?`,
      [user.id]
    );

    return Response.json({
      payments: payments || [],
      stats: stats && (stats as any)[0] ? (stats as any)[0] : {
        totalJobs: 0,
        totalEarned: 0,
        pendingAmount: 0,
      },
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
