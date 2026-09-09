import { requireAdmin } from '@/app/lib/auth';
import { queryDb, runDb } from '@/app/lib/db';
import { read, utils } from 'xlsx';

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(worksheet);

    let customersAdded = 0;
    let jobsAdded = 0;

    for (const row of data) {
      const customerData = row as any;

      // Extract customer info
      const customerName = customerData.name || customerData.customer || customerData['Customer Name'];
      const customerEmail = customerData.email || customerData['Email'] || `customer_${Date.now()}@booking.local`;
      const customerPhone = customerData.phone || customerData['Phone Number'] || '';
      const customerAddress = customerData.address || customerData['Address'] || '';

      if (!customerName) continue;

      // Check if customer exists
      const existing = await queryDb('SELECT id FROM "Customer" WHERE email = $1', [customerEmail]);
      let customerId = (existing[0] as any)?.id;

      if (!customerId) {
        // Create new customer
        const result = await runDb(
          'INSERT INTO "Customer" (name, email, phone, address) VALUES ($1, $2, $3, $4)',
          [customerName, customerEmail, customerPhone, customerAddress]
        );
        customerId = Number(result.lastInsertRowid);
        customersAdded++;
      }

      // Extract job info
      const jobTitle = customerData.service || customerData['Service'] || customerData.title || 'Service';
      const jobDate = customerData.date || customerData['Date'];
      const jobPrice = parseFloat(customerData.price) || parseFloat(customerData.amount) || 0;
      const jobAddress = customerData.jobAddress || customerData.address || '';

      if (jobDate) {
        // Check if job already exists
        const jobExists = await queryDb(
          'SELECT id FROM "Job" WHERE "customerId" = $1 AND title = $2 AND date = $3',
          [customerId, jobTitle, new Date(jobDate).toISOString()]
        );

        if (jobExists.length === 0) {
          await runDb(
            'INSERT INTO "Job" (title, address, date, price, status, "customerId") VALUES ($1, $2, $3, $4, $5, $6)',
            [jobTitle, jobAddress, new Date(jobDate).toISOString(), jobPrice, 'pending', customerId]
          );
          jobsAdded++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${customersAdded} customers and ${jobsAdded} jobs`,
      customersAdded,
      jobsAdded
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json(
      { error: `Import failed: ${String(error)}` },
      { status: 500 }
    );
  }
}
