import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db/generated/prisma/index.js';

const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = process.env;
if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USERNAME || !DB_PASSWORD) {
  throw new Error(
    'DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD environment variables are required to run integration tests'
  );
}
const databaseUrl = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const adapter = new PrismaPg({ connectionString: databaseUrl });

/**
 * Prisma client used to connect to the real DB in integration tests.
 */
export const testPrisma = new PrismaClient({ adapter });

/**
 * Resets test data by TRUNCATE-ing all tables.
 * Since the Prisma repository implementation may use a different connection on each call, isolation is achieved via a TRUNCATE per test rather than a transaction rollback.
 */
export async function resetDatabase(): Promise<void> {
  await testPrisma.$executeRawUnsafe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
}
