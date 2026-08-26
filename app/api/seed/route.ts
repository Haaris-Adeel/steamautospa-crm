import { hash } from 'bcryptjs';
import { queryDb, runDb } from '@/app/lib/db';

export async function GET() {
  try {
    // Create admin user
    const adminExists = queryDb('SELECT id FROM User WHERE email = ?', ['admin@example.com']);

    if (adminExists.length === 0) {
      const adminPassword = await hash('admin123', 10);
      runDb(
        'INSERT INTO User (email, password, name, role) VALUES (?, ?, ?, ?)',
        ['admin@example.com', adminPassword, 'Admin User', 'admin']
      );
    }

    // Create employee user
    const employeeExists = queryDb('SELECT id FROM User WHERE email = ?', ['employee@example.com']);

    if (employeeExists.length === 0) {
      const employeePassword = await hash('emp123', 10);
      runDb(
        'INSERT INTO User (email, password, name, role) VALUES (?, ?, ?, ?)',
        ['employee@example.com', employeePassword, 'Employee User', 'employee']
      );
    }

    // Create sample customer
    const customerExists = queryDb('SELECT id FROM Customer WHERE email = ?', ['customer@example.com']);

    if (customerExists.length === 0) {
      runDb(
        'INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, ?, ?)',
        ['John Doe', 'customer@example.com', '555-1234', '123 Main St, Pittsburgh, PA']
      );
    }

    // Create sample job
    const jobCount = queryDb('SELECT COUNT(*) as count FROM Job');
    const count = (jobCount[0] as any)?.count || 0;

    if (count === 0) {
      const employee = queryDb('SELECT id FROM User WHERE email = ?', ['employee@example.com']);
      const customer = queryDb('SELECT id FROM Customer WHERE email = ?', ['customer@example.com']);

      if (employee.length > 0 && customer.length > 0) {
        const jobDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        runDb(
          'INSERT INTO Job (title, description, address, date, price, status, customerId, assignedToId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['Full Detail Service', 'Complete interior and exterior detailing', '456 Oak Ave, Pittsburgh, PA', jobDate, 150, 'pending', (customer[0] as any).id, (employee[0] as any).id]
        );
      }
    }

    return Response.json({
      message: 'Database seeded successfully',
      users: {
        admin: 'admin@example.com / admin123',
        employee: 'employee@example.com / emp123'
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: 'Failed to seed database', details: String(error) }, { status: 500 });
  }
}
