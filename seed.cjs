require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set!");
}

console.log("Connecting to:", connectionString.split("@")[1]?.split("/")[0] || "unknown");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const hashedPassword = bcrypt.hashSync("admin123", 10);

    const user = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        email: "admin@example.com",
        password: hashedPassword,
        name: "Admin User",
        role: "admin",
      },
    });

    console.log("✅ Seeded admin user:", user.email);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error seeding:", e.message);
  process.exit(1);
});
