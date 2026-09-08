import { requireAdmin } from '@/app/lib/auth';
import { queryDb, runDb } from '@/app/lib/db';

async function cleanup() {
  try {
    await requireAdmin();

    // Find and delete jobs with invalid/NaN dates
    const invalidJobs = await queryDb(
      `SELECT id, title, date, customerId FROM Job WHERE date = 'Invalid Date' OR date IS NULL OR date = ''`
    );

    let deletedCount = 0;
    for (const job of invalidJobs) {
      await runDb('DELETE FROM Job WHERE id = ?', [job.id]);
      deletedCount++;
      console.log(`Deleted invalid job: ${job.title} (ID: ${job.id})`);
    }

    // Also check for exact duplicates (same customerId, title, and valid date)
    const duplicates = await queryDb(
      `SELECT customerId, title, date, COUNT(*) as cnt
       FROM Job
       WHERE date NOT IN ('Invalid Date', '') AND date IS NOT NULL
       GROUP BY customerId, title, date
       HAVING cnt > 1`
    );

    let dedupCount = 0;
    for (const dup of duplicates) {
      // Keep the first one, delete the rest
      const allDups = await queryDb(
        'SELECT id FROM Job WHERE customerId = ? AND title = ? AND date = ? ORDER BY id ASC',
        [dup.customerId, dup.title, dup.date]
      );

      for (let i = 1; i < allDups.length; i++) {
        await runDb('DELETE FROM Job WHERE id = ?', [(allDups[i] as any).id]);
        dedupCount++;
      }
    }

    return Response.json({
      message: 'Cleanup complete',
      invalidJobsDeleted: deletedCount,
      duplicatesRemoved: dedupCount
    });
  } catch (error) {
    return Response.json({ error: `Cleanup failed: ${String(error)}` }, { status: 500 });
  }
}

export async function GET() {
  return cleanup();
}

export async function POST() {
  return cleanup();
}
