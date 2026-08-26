import { getValidAccessToken, getSetting, getGoogleSheetsData } from '@/app/lib/googlesheets';

export async function GET() {
  try {
    const refreshToken = getSetting('google_refresh_token');
    if (!refreshToken) {
      return Response.json(getEmptyMetrics());
    }

    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      return Response.json(getEmptyMetrics());
    }

    // Fetch metrics sheet
    const sheetId = '1RPMwnPhAj9ixpYPsr05Z2DuU3z2NpI1a';
    const rows = await getGoogleSheetsData(sheetId, accessToken, 'Daily Entry');

    if (!rows || rows.length < 5) {
      return Response.json(getEmptyMetrics());
    }

    // Get last non-empty data row (skip header rows at top)
    let todayData: string[] | null = null;
    for (let i = rows.length - 1; i >= 4; i--) {
      const row = rows[i] as string[];
      if (row[0] && String(row[0]).trim() !== '') {
        todayData = row;
        break;
      }
    }

    if (!todayData) {
      return Response.json(getEmptyMetrics());
    }

    // Parse values - remove $, commas, % signs
    const parseNum = (val: any): number => {
      if (!val) return 0;
      const str = String(val).replace(/[$,%]/g, '').trim();
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    const metricsData = {
      date: String(todayData[0] || ''),
      adSpend: parseNum(todayData[1]),           // B: Ad Spend ($)
      leads: Math.round(parseNum(todayData[2])), // C: Leads
      peopleBooked: Math.round(parseNum(todayData[3])), // D: People Booked (#)
      cashCollected: parseNum(todayData[4]),    // E: Cash Collected ($)
      dollarsBooked: parseNum(todayData[5]),    // F: Dollars Booked ($)
      costPerLead: parseNum(todayData[6]),      // G: Cost Per Lead
      bookingRate: parseNum(todayData[7]),      // H: Booking Rate
      avgDealSize: parseNum(todayData[8]),      // I: Avg Deal Size ($)
      cashCollectionPct: parseNum(todayData[9]), // J: Cash Collection %
      bookedRoas: parseNum(todayData[10]),      // K: Booked ROAS
      cashRoas: parseNum(todayData[11]),        // L: Cash ROAS
    };

    return Response.json(metricsData);
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return Response.json(getEmptyMetrics());
  }
}

function getEmptyMetrics() {
  return {
    date: '',
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
    cashRoas: 0,
  };
}
