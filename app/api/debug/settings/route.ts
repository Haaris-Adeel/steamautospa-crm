import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    const settings = await queryDb('SELECT key, value FROM "Settings" WHERE key LIKE $1', ['google%']);

    return Response.json({
      settings: settings || [],
      message: 'Google settings found'
    });
  } catch (error) {
    return Response.json({
      error: String(error),
      message: 'Failed to query settings'
    }, { status: 500 });
  }
}
