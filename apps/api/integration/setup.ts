import { afterAll, afterEach } from 'vitest';
import { resetDatabase, testPrisma } from './testClient.js';

afterEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
