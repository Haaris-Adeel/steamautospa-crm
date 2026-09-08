import { requireAdmin } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    await requireAdmin();

    const customers = (await queryDb('SELECT COUNT(*) as count FROM Customer') as any[])[0];
    const jobs = (await queryDb('SELECT COUNT(*) as count FROM Job') as any[])[0];
    const employees = (await queryDb("SELECT COUNT(*) as count FROM User WHERE role = 'employee'") as any[])[0];
    const payments = await queryDb("SELECT amount FROM Payment WHERE status = 'completed'") as any[];

    const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return Response.json({
      customers: customers?.count || 0,
      jobs: jobs?.count || 0,
      employees: employees?.count || 0,
      revenue: Math.round(revenue * 100) / 100
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
