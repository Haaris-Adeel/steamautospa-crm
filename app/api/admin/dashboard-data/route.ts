import { requireAdmin } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    await requireAdmin();

    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(today).toISOString().split('T')[0];

    const last7DaysStr = last7Days.toISOString().split('T')[0];
    const last30DaysStr = last30Days.toISOString().split('T')[0];

    // Revenue Last 7 Days (completed jobs only)
    const revenueThisWeekResult = queryDb(
      `SELECT COALESCE(SUM(price), 0) as total FROM Job
       WHERE DATE(date) >= DATE(?) AND status = 'completed'`,
      [last7DaysStr]
    );
    const revenueThisWeek = revenueThisWeekResult.length > 0 ? revenueThisWeekResult[0].total : 0;

    // Revenue Last 30 Days (completed jobs only)
    const revenueThisMonthResult = queryDb(
      `SELECT COALESCE(SUM(price), 0) as total FROM Job
       WHERE DATE(date) >= DATE(?) AND status = 'completed'`,
      [last30DaysStr]
    );
    const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;

    // Bookings Last 7 Days
    const bookingsThisWeekResult = queryDb(
      `SELECT COUNT(*) as count FROM Job
       WHERE DATE(date) >= DATE(?)`,
      [last7DaysStr]
    );
    const bookingsThisWeek = bookingsThisWeekResult.length > 0 ? bookingsThisWeekResult[0].count : 0;

    // Jobs Completed
    const jobsCompletedResult = queryDb(
      `SELECT COUNT(*) as count FROM Job WHERE status = 'completed'`
    );
    const jobsCompleted = jobsCompletedResult.length > 0 ? jobsCompletedResult[0].count : 0;

    // Expenses Last 30 Days
    const expensesThisMonthResult = queryDb(
      `SELECT COALESCE(SUM(amount), 0) as total FROM Expense
       WHERE date >= ?`,
      [last30Days.toISOString().split('T')[0]]
    );
    const expensesThisMonth = expensesThisMonthResult.length > 0 ? expensesThisMonthResult[0].total : 0;

    // Estimated Profit
    const estimatedProfit = revenueThisMonth - expensesThisMonth;

    // Today's Jobs
    const todaysJobsResult = queryDb(
      `SELECT j.id, j.title, j.address, j.status, j.price, c.name as customerName
       FROM Job j
       LEFT JOIN Customer c ON j.customerId = c.id
       WHERE DATE(j.date) = DATE(?)
       ORDER BY j.date ASC`,
      [startOfDay]
    );

    // Upcoming Bookings (next 14 days, excluding today)
    const upcomingBookingsResult = queryDb(
      `SELECT j.id, j.title, j.date, j.status, j.price, c.name as customerName
       FROM Job j
       LEFT JOIN Customer c ON j.customerId = c.id
       WHERE j.date > ? AND j.date <= ?
       ORDER BY j.date ASC
       LIMIT 10`,
      [startOfDay, new Date(today.getTime() + 14*24*60*60*1000).toISOString()]
    );

    // Top Customers (by spending)
    const topCustomersResult = queryDb(
      `SELECT c.id, c.name, COALESCE(SUM(j.price), 0) as total
       FROM Customer c
       LEFT JOIN Job j ON c.id = j.customerId
       GROUP BY c.id, c.name
       ORDER BY total DESC
       LIMIT 10`
    );

    // Daily revenue for this month
    const dailyRevenueResult = queryDb(
      `SELECT DATE(date) as day, COALESCE(SUM(price), 0) as revenue
       FROM Job
       WHERE DATE(date) >= DATE(?)
       GROUP BY DATE(date)
       ORDER BY DATE(date) ASC`,
      [last30DaysStr]
    );

    const monthlyRevenue: { [key: string]: number } = {};
    dailyRevenueResult.forEach((row: any) => {
      monthlyRevenue[row.day] = Number(row.revenue) || 0;
    });

    // Revenue by Service (using job titles as service names)
    const serviceRevenueResult = queryDb(
      `SELECT j.title as serviceName, COALESCE(SUM(j.price), 0) as revenue
       FROM Job j
       GROUP BY j.title
       ORDER BY revenue DESC`
    );

    const revenueByService: { [key: string]: number } = {};
    serviceRevenueResult.forEach((row: any) => {
      revenueByService[row.serviceName] = row.revenue || 0;
    });

    return Response.json({
      revenueThisWeek: Number(revenueThisWeek) || 0,
      revenueThisMonth: Number(revenueThisMonth) || 0,
      bookingsThisWeek: Number(bookingsThisWeek) || 0,
      jobsCompleted: Number(jobsCompleted) || 0,
      expensesThisMonth: Number(expensesThisMonth) || 0,
      estimatedProfit: Number(estimatedProfit) || 0,
      todaysJobs: todaysJobsResult || [],
      upcomingBookings: upcomingBookingsResult || [],
      topCustomers: topCustomersResult || [],
      revenueByService: revenueByService || {},
      monthlyRevenue: monthlyRevenue || {},
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
