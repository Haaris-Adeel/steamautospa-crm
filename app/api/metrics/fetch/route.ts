import { requireAdmin } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'last7days';

    const metrics = await queryDb('SELECT * FROM MetricsSnapshot WHERE period = ?', [period]);

    if (metrics.length === 0) {
      return Response.json({
        adSpend: 0,
        leads: 0,
        peopleBooked: 0,
        cashCollected: 0,
        dollarsBooked: 0,
        costPerLead: 0,
        bookingRate: 0,
        avgDealSize: 0,
        cashCollectionPct: 0,
        bookedRoas: 0,
        cashRoas: 0
      });
    }

    const data = metrics[0] as any;
    return Response.json({
      adSpend: data.adSpend,
      leads: data.leads,
      peopleBooked: data.peopleBooked,
      cashCollected: data.cashCollected,
      dollarsBooked: data.dollarsBooked,
      costPerLead: data.costPerLead,
      bookingRate: data.bookingRate,
      avgDealSize: data.avgDealSize,
      cashCollectionPct: data.cashCollectionPct,
      bookedRoas: data.bookedRoas,
      cashRoas: data.cashRoas
    });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
