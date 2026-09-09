import cron from 'node-cron';
import { getValidAccessToken, getSetting, getGoogleSheetsData, setSetting } from './googlesheets';
import { queryDb, runDb } from './db';

let syncJob: cron.ScheduledTask | null = null;

export function initializeSyncScheduler() {
  if (syncJob) {
    console.log('Sync scheduler already initialized');
    return;
  }

  // Run sync every 30 minutes
  syncJob = cron.schedule('*/30 * * * *', async () => {
    console.log('Running scheduled Google Sheets sync...');
    await performSync();
  });

  console.log('Sync scheduler initialized - will sync every 30 minutes');
}

export function stopSyncScheduler() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    console.log('Sync scheduler stopped');
  }
}

async function syncBookings() {
  try {
    const googleEnabled = await getSetting('google_sheets_enabled') === 'true';
    if (!googleEnabled) {
      console.log('Google Sheets sync disabled, skipping bookings');
      return;
    }

    const refreshToken = await getSetting('google_refresh_token');
    if (!refreshToken) {
      console.log('Google Sheets not configured, skipping bookings sync');
      return;
    }

    const sheetId = await getSetting('google_sheet_id');
    if (!sheetId) {
      console.log('No Google Sheet ID configured, skipping bookings sync');
      return;
    }

    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      console.log('Failed to get Google access token, skipping bookings sync');
      return;
    }

    const rows = await getGoogleSheetsData(sheetId, accessToken);
    if (!rows || rows.length === 0) {
      console.log('No data found in Google Sheet, skipping bookings sync');
      return;
    }

    const headers = rows[0] as string[];
    const headerMap: { [key: string]: number } = {};

    headers.forEach((header, index) => {
      headerMap[header.toLowerCase().trim()] = index;
    });

    let customersAdded = 0;
    let jobsAdded = 0;
    let totalRevenue = 0;
    let skippedZeroAmount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];

      const nameIdx = headerMap['name'] ?? 0;
      const emailIdx = headerMap['email'] ?? 999;
      const phoneIdx = headerMap['phone'] ?? 3;
      const addressIdx = headerMap['address'] ?? 4;
      const serviceIdx = headerMap['service'] ?? 6;
      const dateIdx = headerMap['date'] ?? 1;
      const timeIdx = headerMap['time'] ?? 2;
      const priceIdx = headerMap['charges'] ?? 7;

      let customerName = row[nameIdx]?.trim();
      const customerEmail = row[emailIdx]?.trim() || `customer_${i}@booking.local`;
      const customerPhone = row[phoneIdx]?.trim() || '';
      const customerAddress = row[addressIdx]?.trim() || '';

      const priceStr = row[priceIdx]?.trim() || '0';
      const cleanPrice = priceStr.replace(/[$,]/g, '');
      const jobPrice = parseFloat(cleanPrice) || 0;

      if (jobPrice === 0) {
        skippedZeroAmount++;
        continue;
      }

      if (!customerName) {
        customerName = `Customer #${i}`;
      }

      const existing = await queryDb('SELECT id FROM "Customer" WHERE email = $1', [customerEmail]);
      let customerId = (existing[0] as any)?.id;

      if (!customerId) {
        const result = await runDb(
          'INSERT INTO "Customer" (name, email, phone, address) VALUES ($1, $2, $3, $4)',
          [customerName, customerEmail, customerPhone, customerAddress]
        );
        customerId = Number(result.lastInsertRowid);
        customersAdded++;
      }

      const jobTitle = row[serviceIdx]?.trim() || 'Service';
      const jobDateStr = row[dateIdx]?.trim();
      const jobTimeStr = row[timeIdx]?.trim();

      totalRevenue += jobPrice;

      if (jobDateStr) {
        let parsedDate: Date;
        if (jobDateStr.includes('-')) {
          const parts = jobDateStr.split('-');
          if (parts.length === 3) {
            let month = parseInt(parts[0]);
            let day = parseInt(parts[1]);
            let year = parseInt(parts[2]);

            if (year < 100) {
              year += 2000;
            }

            parsedDate = new Date(year, month - 1, day);
          } else {
            parsedDate = new Date(jobDateStr);
          }
        } else {
          parsedDate = new Date(jobDateStr);
        }

        // Parse time if available (e.g., "10:30 AM", "3:00 PM")
        if (jobTimeStr && jobTimeStr.trim() !== '' && jobTimeStr.trim() !== '-') {
          const timeMatch = jobTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            const period = timeMatch[3]?.toUpperCase();

            if (period) {
              if (period === 'PM' && hour !== 12) hour += 12;
              if (period === 'AM' && hour === 12) hour = 0;
            } else if (hour < 12) {
              hour += 12;
            }

            parsedDate.setHours(hour, minute, 0, 0);
          }
        }

        if (isNaN(parsedDate.getTime())) {
          continue;
        }

        const jobDate = parsedDate.toISOString();
        const now = new Date();
        const jobStatus = parsedDate < now ? 'completed' : 'pending';

        const jobExists = await queryDb(
          'SELECT id FROM "Job" WHERE "customerId" = $1 AND title = $2 AND date = $3',
          [customerId, jobTitle, jobDate]
        );

        if (jobExists.length === 0) {
          await runDb(
            'INSERT INTO "Job" (title, address, date, price, status, "customerId") VALUES ($1, $2, $3, $4, $5, $6)',
            [jobTitle, customerAddress, jobDate, jobPrice, jobStatus, customerId]
          );
          jobsAdded++;
        }
      }
    }

    await setSetting('google_last_sync', new Date().toISOString());

    console.log(
      `Bookings sync complete: ${customersAdded} customers, ${jobsAdded} jobs, $${totalRevenue.toFixed(2)} revenue (skipped ${skippedZeroAmount} canceled)`
    );
  } catch (error) {
    console.error('Bookings sync error:', error);
  }
}

async function syncMetrics() {
  try {
    const googleEnabled = await getSetting('google_sheets_enabled') === 'true';
    if (!googleEnabled) {
      console.log('Google Sheets sync disabled, skipping metrics');
      return;
    }

    const refreshToken = await getSetting('google_refresh_token');
    if (!refreshToken) {
      console.log('Google Sheets not configured, skipping metrics sync');
      return;
    }

    const metricsSheetId = await getSetting('metrics_sheet_id');
    if (!metricsSheetId) {
      console.log('No metrics sheet ID configured, skipping metrics sync');
      return;
    }

    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      console.log('Failed to get access token, skipping metrics sync');
      return;
    }

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
      console.log('MetricsSnapshot table exists');
    }

    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${metricsSheetId}`;
    const metaResponse = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!metaResponse.ok) {
      throw new Error('Failed to fetch spreadsheet metadata');
    }

    const metaData = (await metaResponse.json()) as any;
    const sheets = metaData.sheets || [];

    let dashboardSheet = sheets.find((s: any) => s.properties.title === 'Dashboard');
    if (!dashboardSheet) {
      console.log('Dashboard sheet not found, skipping metrics sync');
      return;
    }

    const encodedRange = encodeURIComponent(`Dashboard!A1:F35`);
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${metricsSheetId}/values/${encodedRange}`;

    const dataResponse = await fetch(dataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!dataResponse.ok) {
      throw new Error('Failed to fetch Dashboard sheet');
    }

    const data = (await dataResponse.json()) as any;
    const rows = data.values || [];

    if (!rows || rows.length < 30) {
      console.log('Dashboard sheet incomplete, skipping metrics sync');
      return;
    }

    const parseValue = (value: string | number): number => {
      if (!value) return 0;
      const str = String(value).trim();
      return parseFloat(str.replace(/[$,%x]/g, '')) || 0;
    };

    const getMetricValue = (rowIndex: number, colIndex: number) => {
      return parseValue((rows[rowIndex] as string[])?.[colIndex] || '0');
    };

    const adSpendLast7 = getMetricValue(4, 4);
    const leadsLast7 = getMetricValue(8, 4);
    const bookedLast7 = getMetricValue(12, 4);
    const cashCollectedLast7 = getMetricValue(16, 4);
    const dollarsBookedLast7 = getMetricValue(20, 4);

    const adSpendThisMonth = getMetricValue(4, 3);
    const leadsThisMonth = getMetricValue(8, 3);
    const bookedThisMonth = getMetricValue(12, 3);
    const cashCollectedThisMonth = getMetricValue(16, 3);
    const dollarsBookedThisMonth = getMetricValue(20, 3);

    const adSpendAllTime = getMetricValue(4, 2);
    const leadsAllTime = getMetricValue(8, 2);
    const bookedAllTime = getMetricValue(12, 2);
    const cashCollectedAllTime = getMetricValue(16, 2);
    const dollarsBookedAllTime = getMetricValue(20, 2);

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

    const last7Ratios = calculateRatios(adSpendLast7, leadsLast7, bookedLast7, cashCollectedLast7, dollarsBookedLast7);
    const thisMonthRatios = calculateRatios(adSpendThisMonth, leadsThisMonth, bookedThisMonth, cashCollectedThisMonth, dollarsBookedThisMonth);
    const allTimeRatios = calculateRatios(adSpendAllTime, leadsAllTime, bookedAllTime, cashCollectedAllTime, dollarsBookedAllTime);

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
    }

    await setSetting('metrics_last_sync', new Date().toISOString());
    console.log('Metrics sync complete');
  } catch (error) {
    console.error('Metrics sync error:', error);
  }
}

async function performSync() {
  await syncBookings();
  await syncMetrics();
}
