import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    // Check what tables exist in the database
    const tables = await queryDb(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'`
    );

    return Response.json({
      success: true,
      tables: (tables as any[]).map(t => t.table_name),
      count: tables.length
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: String(error),
      message: error?.message
    }, { status: 500 });
  }
}
