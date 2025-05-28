import { prisma } from '@/config/database';

// Setup for tests
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});
