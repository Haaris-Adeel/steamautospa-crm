import { requireAdmin } from '@/app/lib/auth';
import { getValidAccessToken, getSetting, setSetting } from '@/app/lib/onedrive';
import { queryDb, runDb } from '@/app/lib/db';
import { read, utils } from 'xlsx';

export async function POST() {
  try {
    await requireAdmin();

    const oneDriveEnabled = getSetting('onedrive_enabled') === 'true';
    if (!oneDriveEnabled) {
      return Response.json({ error: 'OneDrive not connected' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return Response.json({ error: 'OneDrive authentication expired' }, { status: 401 });
    }

    const filePath = getSetting('onedrive_file_path');
    if (!filePath) {
      return Response.json({ error: 'No OneDrive file path configured' }, { status: 400 });
    }

    // Download file from OneDrive
    const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/content`;
    const fileResponse = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to download file from OneDrive' }, { status: 400 });
    }

    const buffer = await fileResponse.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(worksheet);

    let customersAdded = 0;
    let jobsAdded = 0;

    for (const row of data) {
      const customerData = row as any;

      const customerName = customerData.name || customerData.customer || customerData['Customer Name'];
      const customerEmail = customerData.email || customerData['Email'] || `customer_${Date.now()}@booking.local`;
      const customerPhone = customerData.phone || customerData['Phone Number'] || '';
      const customerAddress = customerData.address || customerData['Address'] || '';

      if (!customerName) continue;

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

      const jobTitle = customerData.service || customerData['Service'] || customerData.title || 'Service';
      const jobDate = customerData.date || customerData['Date'];
      const jobPrice = parseFloat(customerData.price) || parseFloat(customerData.amount) || 0;
      const jobAddress = customerData.jobAddress || customerData.address || '';

      if (jobDate) {
        const jobExists = queryDb(
          'SELECT id FROM Job WHERE customerId = ? AND title = ? AND date = ?',
          [customerId, jobTitle, new Date(jobDate).toISOString()]
        );

        if (jobExists.length === 0) {
          runDb(
            'INSERT INTO Job (title, address, date, price, status, customerId) VALUES (?, ?, ?, ?, ?, ?)',
            [jobTitle, jobAddress, new Date(jobDate).toISOString(), jobPrice, 'pending', customerId]
          );
          jobsAdded++;
        }
      }
    }

    setSetting('onedrive_last_sync', new Date().toISOString());

    return Response.json({
      success: true,
      message: `Synced from OneDrive: ${customersAdded} customers, ${jobsAdded} jobs`,
      customersAdded,
      jobsAdded
    });
  } catch (error) {
    console.error('OneDrive sync error:', error);
    return Response.json({ error: `Sync failed: ${String(error)}` }, { status: 500 });
  }
}
