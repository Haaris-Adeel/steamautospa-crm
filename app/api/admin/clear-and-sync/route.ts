import { requireAdmin } from '@/app/lib/auth';
import { runDb, queryDb } from '@/app/lib/db';
import { getValidAccessToken, getSetting, getGoogleSheetsData } from '@/app/lib/googlesheets';

export async function POST() {
  try {
    await requireAdmin();

    // Clear all jobs
    await runDb('DELETE FROM "Job"');

    // Now sync from Google Sheets
    const googleEnabled = await getSetting('google_sheets_enabled') === 'true';
    if (!googleEnabled) {
      return Response.json({ error: 'Google Sheets not connected' }, { status: 400 });
    }

    const refreshToken = await getSetting('google_refresh_token');
    if (!refreshToken) {
      return Response.json({ error: 'Google authentication expired' }, { status: 401 });
    }

    const sheetId = await getSetting('google_sheet_id');
    if (!sheetId) {
      return Response.json({ error: 'No Google Sheet ID configured' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      return Response.json({ error: 'Failed to get access token' }, { status: 401 });
    }

    const rows = await getGoogleSheetsData(sheetId, accessToken);

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No data found in Google Sheet' }, { status: 400 });
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
    let skippedInvalidDates = 0;

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
      const jobAddress = row[addressIdx]?.trim() || '';

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
              // If no period specified and hour is 1-11, assume PM
              hour += 12;
            }

            parsedDate.setHours(hour, minute, 0, 0);
          }
        }

        // Skip if date is invalid
        if (isNaN(parsedDate.getTime())) {
          console.log(`Skipping row ${i}: Invalid date - "${jobDateStr}" with time "${jobTimeStr}" for ${customerName}`);
          skippedInvalidDates++;
          continue;
        }

        const jobDate = parsedDate.toISOString();

        // If job date/time is in the past (now), mark as completed
        const now = new Date();
        const jobStatus = parsedDate < now ? 'completed' : 'pending';

        const jobExists = await queryDb(
          'SELECT id FROM "Job" WHERE "customerId" = $1 AND title = $2 AND date = $3',
          [customerId, jobTitle, jobDate]
        );

        if (jobExists.length === 0) {
          await runDb(
            'INSERT INTO "Job" (title, address, date, price, status, "customerId") VALUES ($1, $2, $3, $4, $5, $6)',
            [jobTitle, jobAddress, jobDate, jobPrice, jobStatus, customerId]
          );
          jobsAdded++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Cleared and re-synced: ${customersAdded} customers, ${jobsAdded} jobs, $${totalRevenue.toFixed(2)} revenue (skipped ${skippedZeroAmount} zero bookings, ${skippedInvalidDates} invalid dates)`,
      customersAdded,
      jobsAdded,
      totalRevenue: totalRevenue.toFixed(2),
      skippedZeroAmount,
      skippedInvalidDates
    });
  } catch (error) {
    console.error('Clear and sync error:', error);
    return Response.json({ error: `Failed: ${String(error)}` }, { status: 500 });
  }
}
