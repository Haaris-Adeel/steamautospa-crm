import { requireAdmin } from '@/app/lib/auth';
import { getValidAccessToken, getSetting, setSetting, getGoogleSheetsData } from '@/app/lib/googlesheets';
import { queryDb, runDb } from '@/app/lib/db';

function parseValue(value: string | number): number {
  if (!value) return 0;
  const str = String(value).trim();
  return parseFloat(str.replace(/[$,%x]/g, '')) || 0;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    // Ensure MetricsSnapshot table exists
    try {
      await runDb(`CREATE TABLE IF NOT EXISTS "MetricsSnapshot" (
        id SERIAL PRIMARY KEY,
        period TEXT UNIQUE NOT NULL,
        "adSpend" REAL DEFAULT 0,
        leads INTEGER DEFAULT 0,
        "peopleBooked" INTEGER DEFAULT 0,
        "cashCollected" REAL DEFAULT 0,
        "dollarsBooked" REAL DEFAULT 0,
        "costPerLead" REAL DEFAULT 0,
        "bookingRate" REAL DEFAULT 0,
        "avgDealSize" REAL DEFAULT 0,
        "cashCollectionPct" REAL DEFAULT 0,
        "bookedRoas" REAL DEFAULT 0,
        "cashRoas" REAL DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    } catch (e) {
      console.log('Table creation attempt:', e);
    }

    const googleEnabled = await getSetting('google_sheets_enabled') === 'true';
    if (!googleEnabled) {
      return Response.json({ error: 'Google Sheets not connected' }, { status: 400 });
    }

    const refreshToken = await getSetting('google_refresh_token');
    if (!refreshToken) {
      return Response.json({ error: 'Google authentication expired' }, { status: 401 });
    }

    const metricsSheetId = await getSetting('metrics_sheet_id');
    if (!metricsSheetId) {
      return Response.json({ error: 'No metrics sheet ID configured' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      return Response.json({ error: 'Failed to get access token' }, { status: 401 });
    }

    // Get sheet metadata to find the Daily_Metrics_Tracker sheet ID
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${metricsSheetId}`;
    const metaResponse = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!metaResponse.ok) {
      throw new Error('Failed to fetch spreadsheet metadata');
    }

    const metaData = (await metaResponse.json()) as any;
    const sheets = metaData.sheets || [];

    // Log all sheets
    sheets.forEach((s: any, idx: number) => {
      console.log(`Sheet ${idx}: "${s.properties.title}" (gid: ${s.properties.sheetId})`);
    });

    // Find the Dashboard sheet which has the summary metrics organized by period
    let dashboardSheet = sheets.find((s: any) => s.properties.title === 'Dashboard');

    if (!dashboardSheet) {
      return Response.json({
        error: `Dashboard sheet not found. Available: ${sheets.map((s: any) => s.properties.title).join(', ')}`
      }, { status: 400 });
    }

    console.log('Reading metrics from Dashboard sheet');

    // Fetch the Dashboard sheet data with all needed rows
    // We need rows 1-30+ to get all the metrics (Ad Spend at row 5, Leads at 9, People Booked at 13, etc.)
    const encodedRange = encodeURIComponent(`Dashboard!A1:F35`);
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${metricsSheetId}/values/${encodedRange}`;

    const dataResponse = await fetch(dataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      console.error('Sheet API error:', errorText);
      throw new Error(`Failed to fetch Dashboard sheet: ${errorText}`);
    }

    const data = (await dataResponse.json()) as any;
    const rows = data.values || [];

    if (!rows || rows.length < 30) {
      return Response.json({ error: 'Dashboard sheet data incomplete' }, { status: 400 });
    }

    // Extract values from Dashboard sheet structure
    // Row indices (0-based): Row 5 = index 4 (Ad Spend), Row 9 = index 8 (Leads), etc.
    // Columns: C = index 2 (All-Time), D = index 3 (This Month), E = index 4 (Last 7 Days)

    const getMetricValue = (rowIndex: number, colIndex: number) => {
      return parseValue((rows[rowIndex] as string[])?.[colIndex] || '0');
    };

    // Row 5: Ad Spend
    const adSpendAllTime = getMetricValue(4, 2);
    const adSpendThisMonth = getMetricValue(4, 3);
    const adSpendLast7 = getMetricValue(4, 4);

    // Row 9: Leads
    const leadsAllTime = getMetricValue(8, 2);
    const leadsThisMonth = getMetricValue(8, 3);
    const leadsLast7 = getMetricValue(8, 4);

    // Row 13: People Booked
    const bookedAllTime = getMetricValue(12, 2);
    const bookedThisMonth = getMetricValue(12, 3);
    const bookedLast7 = getMetricValue(12, 4);

    // Row 17: Cash Collected
    const cashCollectedAllTime = getMetricValue(16, 2);
    const cashCollectedThisMonth = getMetricValue(16, 3);
    const cashCollectedLast7 = getMetricValue(16, 4);

    // Row 21: Dollars Booked
    const dollarsBookedAllTime = getMetricValue(20, 2);
    const dollarsBookedThisMonth = getMetricValue(20, 3);
    const dollarsBookedLast7 = getMetricValue(20, 4);

    // Calculate ratios for each period
    // ROAS = Dollars Booked / Ad Spend, Cash ROAS = Cash Collected / Ad Spend
    // Booking Rate = People Booked / Leads

    const calculateRatios = (adSpend: number, leads: number, peopleBooked: number, cashCollected: number, dollarsBooked: number) => {
      return {
        bookedRoas: adSpend > 0 ? dollarsBooked / adSpend : 0,
        cashRoas: adSpend > 0 ? cashCollected / adSpend : 0,
        bookingRate: leads > 0 ? (peopleBooked / leads) * 100 : 0,
        costPerLead: leads > 0 ? adSpend / leads : 0,
        avgDealSize: peopleBooked > 0 ? dollarsBooked / peopleBooked : 0,
        cashCollectionPct: dollarsBooked > 0 ? (cashCollected / dollarsBooked) * 100 : 0
      };
    };

    // Calculate ratios for each period
    const last7Ratios = calculateRatios(adSpendLast7, leadsLast7, bookedLast7, cashCollectedLast7, dollarsBookedLast7);
    const thisMonthRatios = calculateRatios(adSpendThisMonth, leadsThisMonth, bookedThisMonth, cashCollectedThisMonth, dollarsBookedThisMonth);
    const allTimeRatios = calculateRatios(adSpendAllTime, leadsAllTime, bookedAllTime, cashCollectedAllTime, dollarsBookedAllTime);

    // Store metrics for each period with calculated ratios
    const periods = [
      {
        name: 'allTime',
        adSpend: adSpendAllTime, leads: leadsAllTime, booked: bookedAllTime,
        cashCollected: cashCollectedAllTime, dollarsBooked: dollarsBookedAllTime,
        ...allTimeRatios
      },
      {
        name: 'thisMonth',
        adSpend: adSpendThisMonth, leads: leadsThisMonth, booked: bookedThisMonth,
        cashCollected: cashCollectedThisMonth, dollarsBooked: dollarsBookedThisMonth,
        ...thisMonthRatios
      },
      {
        name: 'last7days',
        adSpend: adSpendLast7, leads: leadsLast7, booked: bookedLast7,
        cashCollected: cashCollectedLast7, dollarsBooked: dollarsBookedLast7,
        ...last7Ratios
      }
    ];

    let updated = 0;

    for (const period of periods) {
      const existing = await queryDb('SELECT id FROM "MetricsSnapshot" WHERE period = $1', [period.name]);

      if (existing.length === 0) {
        await runDb(
          `INSERT INTO "MetricsSnapshot" (
            period, "adSpend", leads, "peopleBooked", "cashCollected", "dollarsBooked",
            "costPerLead", "bookingRate", "avgDealSize", "cashCollectionPct", "bookedRoas", "cashRoas"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            period.name, period.adSpend, period.leads, period.booked, period.cashCollected, period.dollarsBooked,
            period.costPerLead, period.bookingRate, period.avgDealSize, period.cashCollectionPct, period.bookedRoas, period.cashRoas
          ]
        );
      } else {
        await runDb(
          `UPDATE "MetricsSnapshot" SET
            "adSpend" = $1, leads = $2, "peopleBooked" = $3, "cashCollected" = $4, "dollarsBooked" = $5,
            "costPerLead" = $6, "bookingRate" = $7, "avgDealSize" = $8, "cashCollectionPct" = $9, "bookedRoas" = $10, "cashRoas" = $11, "updatedAt" = CURRENT_TIMESTAMP
            WHERE period = $12`,
          [
            period.adSpend, period.leads, period.booked, period.cashCollected, period.dollarsBooked,
            period.costPerLead, period.bookingRate, period.avgDealSize, period.cashCollectionPct, period.bookedRoas, period.cashRoas, period.name
          ]
        );
      }
      updated++;
    }

    await setSetting('metrics_last_sync', new Date().toISOString());

    return Response.json({
      success: true,
      message: `Synced metrics for 3 periods (All-Time, This Month, Last 7 Days)`,
      updated,
      debug: {
        last7days: {
          adSpend: adSpendLast7,
          leads: leadsLast7,
          booked: bookedLast7,
          bookedRoas: last7Ratios.bookedRoas,
          bookingRate: last7Ratios.bookingRate
        },
        thisMonth: {
          adSpend: adSpendThisMonth,
          bookedRoas: thisMonthRatios.bookedRoas,
          bookingRate: thisMonthRatios.bookingRate
        }
      }
    });
  } catch (error) {
    console.error('Metrics sync error:', error);
    return Response.json({ error: `Sync failed: ${String(error)}` }, { status: 500 });
  }
}
