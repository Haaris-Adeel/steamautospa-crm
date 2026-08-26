import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  });

  if (!adminExists) {
    const adminPassword = await hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'admin'
      }
    });
    console.log('✓ Admin user created');
  }

  // Create employee user
  const employeeExists = await prisma.user.findUnique({
    where: { email: 'employee@example.com' }
  });

  if (!employeeExists) {
    const employeePassword = await hash('emp123', 10);
    await prisma.user.create({
      data: {
        email: 'employee@example.com',
        password: employeePassword,
        name: 'Employee User',
        role: 'employee'
      }
    });
    console.log('✓ Employee user created');
  }

  // Create sample customer
  const customerExists = await prisma.customer.findUnique({
    where: { email: 'customer@example.com' }
  });

  if (!customerExists) {
    await prisma.customer.create({
      data: {
        name: 'John Doe',
        email: 'customer@example.com',
        phone: '555-1234',
        address: '123 Main St, Pittsburgh, PA'
      }
    });
    console.log('✓ Sample customer created');
  }

  // Create sample job
  const jobExists = await prisma.job.count();

  if (jobExists === 0) {
    const employee = await prisma.user.findUnique({
      where: { email: 'employee@example.com' }
    });
    const customer = await prisma.customer.findUnique({
      where: { email: 'customer@example.com' }
    });

    if (employee && customer) {
      await prisma.job.create({
        data: {
          title: 'Full Detail Service',
          description: 'Complete interior and exterior detailing',
          address: '456 Oak Ave, Pittsburgh, PA',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          price: 150,
          status: 'pending',
          customerId: customer.id,
          assignedToId: employee.id
        }
      });
      console.log('✓ Sample job created');
    }
  }

  console.log('\n✨ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
