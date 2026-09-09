import { requireAuth } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth() as any;

    if (user.role !== 'employee') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'accept') {
      await queryDb(
        `UPDATE "Job" SET status = $1 WHERE id = $2 AND "assignedToId" = $3`,
        ['in_progress', parseInt(params.id), user.id]
      );

      return Response.json({ success: true, message: 'Job accepted' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
