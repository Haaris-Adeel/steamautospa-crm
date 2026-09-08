import { requireAdmin } from '@/app/lib/auth';
import { getValidAccessToken, getSetting, setSetting, getGoogleSheetsData } from '@/app/lib/googlesheets';
import { queryDb, runDb } from '@/app/lib/db';

export async function POST(req: Request) {
  try {
    await requireAdmin();

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

    // Get data from Google Sheets
    const rows = await getGoogleSheetsData(sheetId, accessToken);

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No data found in Google Sheet' }, { status: 400 });
    }

    // Parse headers from first row
    const headers = rows[0] as string[];
    const headerMap: { [key: string]: number } = {};

    headers.forEach((header, index) => {
      headerMap[header.toLowerCase().trim()] = index;
    });

    let customersAdded = 0;
    let jobsAdded = 0;
    let totalRevenue = 0;
    let skippedZeroAmount = 0;
    let deletedJobs = 0;

    // Get all current emails from sheet to track what should exist
    const sheetEmails = new Set<string>();

    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];

      // DEBUG: Log rows 116-121 to see what's being read
      if (i >= 116 && i <= 121) {
        console.log(`Row ${i}: cols[0]="${row[0]}" cols[1]="${row[1]}" cols[7]="${row[7]}"`);
      }

      // Extract customer info - Phase II sheet structure
      // A: Name, B: Date, C: Time, D: Phone, E: Address, F: Car Type, G: Service, H: Charges, I: Tips
      const nameIdx = 0;      // A: Name
      const dateIdx = 1;      // B: Date
      const timeIdx = 2;      // C: Time
      const phoneIdx = 3;     // D: Phone
      const addressIdx = 4;   // E: Address
      const serviceIdx = 6;   // G: Service
      const priceIdx = 7;     // H: Charges
      const emailIdx = 999;   // No email column

      let customerName = row[nameIdx]?.trim();
      const customerEmail = row[emailIdx]?.trim() || `customer_${i}@booking.local`;
      const customerPhone = row[phoneIdx]?.trim() || '';
      const customerAddress = row[addressIdx]?.trim() || '';

      // Extract job price (remove $ signs and commas)
      const priceStr = row[priceIdx]?.trim() || '0';
      const cleanPrice = priceStr.replace(/[$,]/g, '');
      const jobPrice = parseFloat(cleanPrice) || 0;

      // Skip rows with no price/amount (canceled bookings)
      if (jobPrice === 0) {
        skippedZeroAmount++;
        continue;
      }

      // Track this email as it exists in the sheet
      sheetEmails.add(customerEmail);

      // Generate name if missing
      if (!customerName) {
        customerName = `Customer #${i}`;
      }

      // Check if customer exists
      const existing = await queryDb('SELECT id FROM Customer WHERE email = ?', [customerEmail]);
      let customerId = (existing[0] as any)?.id;

      if (!customerId) {
        const result = await runDb(
          'INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, ?, ?)',
          [customerName, customerEmail, customerPhone, customerAddress]
        );
        customerId = Number(result.lastInsertRowid);
        customersAdded++;
      } else {
        // Update customer info if it exists (name, phone, address might have changed)
        await runDb(
          'UPDATE Customer SET name = ?, phone = ?, address = ? WHERE id = ?',
          [customerName, customerPhone, customerAddress, customerId]
        );
      }

      // Extract job info
      const jobTitle = row[serviceIdx]?.trim() || 'Service';
      const jobDateStr = row[dateIdx]?.trim();
      const jobTimeStr = row[timeIdx]?.trim();
      const jobAddress = row[addressIdx]?.trim() || '';

      totalRevenue += jobPrice;

      if (jobDateStr) {
        // Parse date: handles formats like "8-17-26", "8-17-2026", "2026-08-17"
        let parsedDate: Date;
        if (jobDateStr.includes('-')) {
          const parts = jobDateStr.split('-');
          if (parts.length === 3) {
            let month = parseInt(parts[0]);
            let day = parseInt(parts[1]);
            let year = parseInt(parts[2]);

            // Handle 2-digit years: 00-99 becomes 2000-2099
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

        // Parse time if available (e.g., "10:30 AM", "3:00 PM", "10:30")
        if (jobTimeStr && jobTimeStr.trim() !== '' && jobTimeStr.trim() !== '-') {
          const timeMatch = jobTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            const period = timeMatch[3]?.toUpperCase();

            // Convert to 24-hour format if AM/PM is provided
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

        // If job date/time is in the past (now), mark as completed
        const now = new Date();
        const jobStatus = parsedDate < now ? 'completed' : 'pending';

        const jobExists = await queryDb(
          'SELECT id FROM Job WHERE customerId = ? AND title = ? AND date = ?',
          [customerId, jobTitle, jobDate]
        );

        if (jobExists.length === 0) {
          await runDb(
            'INSERT INTO Job (title, address, date, price, status, customerId) VALUES (?, ?, ?, ?, ?, ?)',
            [jobTitle, jobAddress, jobDate, jobPrice, jobStatus, customerId]
          );
          jobsAdded++;
        }
      }
    }

    // Delete jobs for customers that are no longer in the sheet
    const allCustomersWithJobs = await queryDb('SELECT DISTINCT customerId FROM Job');
    for (const row of allCustomersWithJobs) {
      const customerId = (row as any).customerId;
      const customer = await queryDb('SELECT email FROM Customer WHERE id = ?', [customerId]);
      if (customer.length > 0) {
        const customerEmail = (customer[0] as any).email;
        if (!sheetEmails.has(customerEmail)) {
          const deleted = await runDb('DELETE FROM Job WHERE customerId = ?', [customerId]);
          deletedJobs += deleted.changes || 0;
        }
      }
    }

    await setSetting('google_last_sync', new Date().toISOString());

    return Response.json({
      success: true,
      message: `Synced from Google Sheets: ${customersAdded} customers, ${jobsAdded} jobs, $${totalRevenue.toFixed(2)} revenue. Removed ${deletedJobs} canceled jobs (skipped ${skippedZeroAmount} zero-price rows).`,
      customersAdded,
      jobsAdded,
      totalRevenue: totalRevenue.toFixed(2),
      skippedZeroAmount,
      deletedJobs
    });
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return Response.json({ error: `Sync failed: ${String(error)}` }, { status: 500 });
  }
}
