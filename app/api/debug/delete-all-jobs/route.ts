import { requireAdmin } from '@/app/lib/auth';
import { runDb, queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    await requireAdmin();

    // Get count before delete
    const countBefore = await queryDb('SELECT COUNT(*) as count FROM Job');
    const before = (countBefore[0] as any)?.count || 0;

    // Delete all jobs
    await runDb('DELETE FROM Job');

    // Verify deletion
    const countAfter = await queryDb('SELECT COUNT(*) as count FROM Job');
    const after = (countAfter[0] as any)?.count || 0;

    return Response.json({
      message: 'All jobs deleted',
      deletedCount: before,
      verifyCount: after
    });
  } catch (error) {
    return Response.json({ error: `Delete failed: ${String(error)}` }, { status: 500 });
  }
}
