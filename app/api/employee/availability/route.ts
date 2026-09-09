import { requireAuth } from '@/app/lib/auth';
import { queryDb } from '@/app/lib/db';

export async function GET() {
  try {
    const user = await requireAuth() as any;

    if (user.role !== 'employee') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const availability = await queryDb(
      `SELECT * FROM "EmployeeAvailability" WHERE "userId" = $1`,
      [user.id]
    );

    return Response.json(availability || {});
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth() as any;

    if (user.role !== 'employee') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const availability = await request.json();

    const existing = await queryDb(
      `SELECT id FROM "EmployeeAvailability" WHERE "userId" = $1`,
      [user.id]
    );

    if (existing && (existing as any)[0]) {
      await queryDb(
        `UPDATE "EmployeeAvailability"
         SET monday = $1, tuesday = $2, wednesday = $3, thursday = $4, friday = $5, saturday = $6, sunday = $7, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $8`,
        [
          availability.monday,
          availability.tuesday,
          availability.wednesday,
          availability.thursday,
          availability.friday,
          availability.saturday,
          availability.sunday,
          user.id,
        ]
      );
    } else {
      await queryDb(
        `INSERT INTO "EmployeeAvailability" ("userId", monday, tuesday, wednesday, thursday, friday, saturday, sunday)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          availability.monday,
          availability.tuesday,
          availability.wednesday,
          availability.thursday,
          availability.friday,
          availability.saturday,
          availability.sunday,
        ]
      );
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}
