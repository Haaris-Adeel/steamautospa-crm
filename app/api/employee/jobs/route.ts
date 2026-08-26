import { requireAuth } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    const user = await requireAuth() as any;

    if (user.role !== 'employee') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = queryDb(
      `SELECT
        Job.id,
        Job.title,
        Job.description,
        Job.address,
        Job.date,
        Job.status,
        Job.price,
        Customer.name as customerName,
        Customer.email as customerEmail,
        Customer.phone as customerPhone
       FROM Job
       LEFT JOIN Customer ON Job.customerId = Customer.id
       WHERE Job.assignedToId = ? AND Job.date >= datetime('now')
       ORDER BY Job.date ASC`,
      [user.id]
    );

    return Response.json(jobs);
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
