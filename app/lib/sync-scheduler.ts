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

async function performSync() {
  try {
    const googleEnabled = getSetting('google_sheets_enabled') === 'true';
    if (!googleEnabled) {
      console.log('Google Sheets sync disabled, skipping');
      return;
    }

    const refreshToken = getSetting('google_refresh_token');
    if (!refreshToken) {
      console.log('Google Sheets not configured, skipping sync');
      return;
    }

    const sheetId = getSetting('google_sheet_id');
    if (!sheetId) {
      console.log('No Google Sheet ID configured, skipping sync');
      return;
    }

    const accessToken = await getValidAccessToken(refreshToken);
    if (!accessToken) {
      console.log('Failed to get Google access token, skipping sync');
      return;
    }

    const rows = await getGoogleSheetsData(sheetId, accessToken);
    if (!rows || rows.length === 0) {
      console.log('No data found in Google Sheet, skipping sync');
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

      const nameIdx = headerMap['name'] ?? headerMap['customer name'] ?? 0;
      const emailIdx = headerMap['email'] ?? 1;
      const phoneIdx = headerMap['phone'] ?? headerMap['phone number'] ?? 2;
      const addressIdx = headerMap['address'] ?? 5;
      const serviceIdx = headerMap['service'] ?? 6;
      const dateIdx = headerMap['date'] ?? 1;
      const timeIdx = headerMap['time'] ?? 2;
      const priceIdx = headerMap['charges'] ?? headerMap['price'] ?? headerMap['amount'] ?? 7;

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

      const existing = queryDb('SELECT id FROM Customer WHERE email = ?', [customerEmail]);
      let customerId = (existing[0] as any)?.id;

      if (!customerId) {
        const result = runDb(
          'INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, ?, ?)',
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
              // If no period specified and hour is 1-11, assume PM
              hour += 12;
            }

            parsedDate.setHours(hour, minute, 0, 0);
          }
        }

        // Skip if date is invalid
        if (isNaN(parsedDate.getTime())) {
          continue;
        }

        const jobDate = parsedDate.toISOString();

        // If job date is in the past, mark as completed
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const jobStatus = parsedDate < today ? 'completed' : 'pending';

        const jobExists = queryDb(
          'SELECT id FROM Job WHERE customerId = ? AND title = ? AND date = ?',
          [customerId, jobTitle, jobDate]
        );

        if (jobExists.length === 0) {
          runDb(
            'INSERT INTO Job (title, address, date, price, status, customerId) VALUES (?, ?, ?, ?, ?, ?)',
            [jobTitle, customerAddress, jobDate, jobPrice, jobStatus, customerId]
          );
          jobsAdded++;
        }
      }
    }

    setSetting('google_last_sync', new Date().toISOString());

    console.log(
      `Scheduled sync complete: ${customersAdded} customers, ${jobsAdded} jobs, $${totalRevenue.toFixed(2)} revenue (skipped ${skippedZeroAmount} canceled bookings)`
    );
  } catch (error) {
    console.error('Scheduled Google Sheets sync error:', error);
  }
}
