import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    // Get today's date and the last 7 days snapshot
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Query MetaDailyMetrics for the last 7 days
    const result = await queryDb(
      `SELECT
        SUM(spend) as total_spend,
        SUM(leads) as total_leads,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(conversions) as total_conversions,
        AVG(cpl) as avg_cpl
       FROM "MetaDailyMetrics"
       WHERE date >= $1 AND date <= $2`,
      [lastWeek, today]
    );

    const row = result[0] as any;

    const spend = parseFloat(row?.total_spend || '0');
    const leads = parseInt(row?.total_leads || '0', 10);
    const impressions = parseInt(row?.total_impressions || '0', 10);
    const clicks = parseInt(row?.total_clicks || '0', 10);
    const conversions = parseInt(row?.total_conversions || '0', 10);
    const cpl = parseFloat(row?.avg_cpl || '0');

    // Query MetaMetricsSnapshot for ROAS (requires manual input)
    const snapshotResult = await queryDb(
      `SELECT roas FROM "MetaMetricsSnapshot"
       WHERE period LIKE $1
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [`daily_%`]
    );

    const roas = snapshotResult.length > 0 ? parseFloat((snapshotResult[0] as any).roas || '0') : 0;

    return Response.json({
      spend,
      leads,
      impressions,
      clicks,
      conversions,
      cpl,
      roas
    });
  } catch (error) {
    console.error('Failed to fetch Meta metrics:', error);
    return Response.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
