import { queryDb } from '@/app/lib/db';

export async function GET(request: Request) {
  try {
    const all = await queryDb(`
      SELECT c.id, c.name, c.email, j.id as "jobId", j.title, j.date, j.price
      FROM "Customer" c
      JOIN "Job" j ON c.id = j."customerId"
      ORDER BY j.date
    `);

    const sept7_8 = await queryDb(`
      SELECT c.id, c.name, c.email, j.id as "jobId", j.title, j.date, j.price
      FROM "Customer" c
      JOIN "Job" j ON c.id = j."customerId"
      WHERE j.date >= '2026-09-07 00:00:00' AND j.date < '2026-09-09 00:00:00'
      ORDER BY j.date
    `);

    return Response.json({ sept7_8, total: all.length });
  } catch (error) {
    return Response.json({ error: String(error), stack: error instanceof Error ? error.stack : '' }, { status: 500 });
  }
}
