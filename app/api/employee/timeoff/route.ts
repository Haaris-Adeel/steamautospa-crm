import { requireAuth } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    const user = await requireAuth() as any;

    if (user.role !== 'employee') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await queryDb(
      `SELECT * FROM TimeOffRequest WHERE userId = ? ORDER BY startDate DESC`,
      [user.id]
    );

    return Response.json(requests || []);
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth() as any;

    if (user.role !== 'employee') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate, reason } = await request.json();

    if (!startDate || !endDate) {
      return Response.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    await queryDb(
      `INSERT INTO TimeOffRequest (userId, startDate, endDate, reason, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [user.id, startDate, endDate, reason || null]
    );

    return Response.json({ success: true, message: 'Time off request submitted' });
  } catch {
    return Response.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
