import { requireAdmin } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    await requireAdmin();

    // Get this week's date range
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startIso = startOfWeek.toISOString();
    const endIso = endOfWeek.toISOString();

    // Get jobs for this week
    const jobs = await queryDb(
      `SELECT * FROM Job
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC`,
      [startIso, endIso]
    );

    // Get customers with jobs this week (unique)
    const customerIds = new Set<number>();
    const jobsArray = jobs as any[];
    jobsArray.forEach(job => {
      customerIds.add(job.customerId);
    });

    const customers = [];
    for (const customerId of Array.from(customerIds)) {
      const result = await queryDb('SELECT * FROM Customer WHERE id = ?', [customerId]);
      if (result.length > 0) {
        customers.push(result[0]);
      }
    }

    return Response.json({
      jobs: jobsArray,
      customers: customers
    });
  } catch (error) {
    console.error('Error fetching weekly data:', error);
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
