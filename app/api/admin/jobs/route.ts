import { requireAdmin } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    await requireAdmin();

    const jobs = await queryDb(`
      SELECT Job.*, Customer.name as customerName, Customer.email as customerEmail, Customer.phone as customerPhone
      FROM Job
      LEFT JOIN Customer ON Job.customerId = Customer.id
      ORDER BY Job.date DESC
    `);

    return Response.json(jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      address: job.address,
      date: job.date,
      price: job.price,
      status: job.status,
      customer: {
        name: job.customerName || 'Unknown',
        email: job.customerEmail || '',
        phone: job.customerPhone || ''
      }
    })));
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
