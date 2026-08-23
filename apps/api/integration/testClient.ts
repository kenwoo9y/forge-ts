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
 * Integrationテストで実DBに接続するために使うPrismaクライアント。
 */
export const testPrisma = new PrismaClient({ adapter });

/**
 * 全テーブルをTRUNCATEしてテストデータをリセットする。
 * Prismaのリポジトリ実装は呼び出しごとに別コネクションを使いうるため、トランザクションロールバックではなくテストごとのTRUNCATEで分離する。
 */
export async function resetDatabase(): Promise<void> {
  await testPrisma.$executeRawUnsafe('TRUNCATE TABLE "tasks", "users" RESTART IDENTITY CASCADE');
}
