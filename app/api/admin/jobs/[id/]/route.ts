import { requireAdmin } from '@/app/lib/auth';
import { runDb } from '@/app/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const { status } = await req.json();
    const jobId = parseInt(params.id);

    if (!status || !['pending', 'completed', 'in_progress'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    runDb('UPDATE Job SET status = ? WHERE id = ?', [status, jobId]);

    return Response.json({ success: true, message: 'Job status updated' });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
