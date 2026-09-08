import { requireAdmin } from '@/app/lib/auth';
import { getValidAccessToken, getSetting, getGoogleSheetsData } from '@/app/lib/googlesheets';

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const googleEnabled = getSetting('google_sheets_enabled') === 'true';
    if (!googleEnabled) {
      return Response.json({ error: 'Google Sheets not connected' }, { status: 400 });
    }

    const refreshToken = getSetting('google_refresh_token');
    if (!refreshToken) {
      return Response.json({ error: 'Google authentication expired' }, { status: 401 });
    }

    const sheetId = '186odXNt47LddBzra8SteMAs3cMNBBwq7ehU8g_hLzmw';
    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      return Response.json({ error: 'Failed to get access token' }, { status: 401 });
    }

    const rows = await getGoogleSheetsData(sheetId, accessToken, 'Daily Entry');
    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No data found' }, { status: 400 });
    }

    // Parse headers
    const headers = rows[0] as string[];
    const headerMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      headerMap[header.toLowerCase().trim()] = index;
    });

    const dateIdx = headerMap['date'] ?? 0;
    const adSpendIdx = headerMap['ad spend ($)'] ?? 1;
    const leadsIdx = headerMap['leads (ads)'] ?? 3;
    const bookedIdx = headerMap['people booked (not ads)'] ?? 4;
    const cashCollectedIdx = headerMap['cash collected ($)'] ?? 6;
    const dollarsBookedIdx = headerMap['dollars booked ($)'] ?? 7;
    const costPerLeadIdx = headerMap['cost per lead'] ?? 8;
    const bookingRateIdx = headerMap['booking rate'] ?? 9;
    const avgDealSizeIdx = headerMap['avg deal size ($)'] ?? 10;

    // Get last 7 days data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalAdSpend = 0;
    let totalLeads = 0;
    let totalBooked = 0;
    let totalCashCollected = 0;
    let totalDollarsBooked = 0;
    let dataPoints = 0;
    let totalCostPerLead = 0;
    let totalBookingRate = 0;
    let totalAvgDealSize = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const dateStr = row[dateIdx]?.trim();

      if (!dateStr) continue;

      // Parse date
      let rowDate: Date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        rowDate = new Date(year, month - 1, day);
      } else {
        rowDate = new Date(dateStr);
      }

      if (rowDate < sevenDaysAgo || rowDate > today) continue;

      // Parse metrics
      const adSpend = parseFloat(row[adSpendIdx]?.replace(/[$,]/g, '') || '0') || 0;
      const leads = parseInt(row[leadsIdx] || '0') || 0;
      const booked = parseInt(row[bookedIdx] || '0') || 0;
      const cashCollected = parseFloat(row[cashCollectedIdx]?.replace(/[$,]/g, '') || '0') || 0;
      const dollarsBooked = parseFloat(row[dollarsBookedIdx]?.replace(/[$,]/g, '') || '0') || 0;
      const costPerLead = parseFloat(row[costPerLeadIdx] || '0') || 0;
      const bookingRate = parseFloat(row[bookingRateIdx]?.replace(/%/g, '') || '0') || 0;
      const avgDealSize = parseFloat(row[avgDealSizeIdx]?.replace(/[$,]/g, '') || '0') || 0;

      if (adSpend > 0 || leads > 0) {
        totalAdSpend += adSpend;
        totalLeads += leads;
        totalBooked += booked;
        totalCashCollected += cashCollected;
        totalDollarsBooked += dollarsBooked;
        totalCostPerLead += costPerLead;
        totalBookingRate += bookingRate;
        totalAvgDealSize += avgDealSize;
        dataPoints++;
      }
    }

    const avgCostPerLead = dataPoints > 0 ? totalCostPerLead / dataPoints : 0;
    const avgBookingRate = dataPoints > 0 ? (totalBookingRate / dataPoints) : 0;
    const avgDealSize = dataPoints > 0 ? totalAvgDealSize / dataPoints : 0;
    const roas = totalAdSpend > 0 ? (totalCashCollected / totalAdSpend).toFixed(2) : '0.00';
    const roi = totalAdSpend > 0 ? ((totalCashCollected - totalAdSpend) / totalAdSpend * 100) : 0;

    return Response.json({
      adSpend: totalAdSpend.toFixed(2),
      leads: totalLeads,
      booked: totalBooked,
      cashCollected: totalCashCollected.toFixed(2),
      dollarsBooked: totalDollarsBooked.toFixed(2),
      roas,
      bookingRate: avgBookingRate.toFixed(1),
      avgDealSize: avgDealSize.toFixed(2),
      roi: roi.toFixed(1)
    });
  } catch (error) {
    console.error('Marketing metrics error:', error);
    return Response.json({ error: `Failed: ${String(error)}` }, { status: 500 });
  }
}
