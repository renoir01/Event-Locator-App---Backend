// Set environment variables for testing
process.env.NODE_ENV = 'test';

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

// Mock Redis client
const redisMock = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue(true),
  duplicate: jest.fn().mockImplementation(function() {
    return this;
  })
};

jest.mock('./src/config/redis', () => redisMock);

const { setupTestDatabase, teardownTestDatabase } = require('./tests/setup');
const db = require('./src/config/database');

// Global setup
beforeAll(async () => {
  console.log('Starting test suite...');
  
  // Set up test database
  await setupTestDatabase();
  
  // Extend Jest with custom matchers
  expect.extend({
    toBeWithinRange(received, floor, ceiling) {
      const pass = received >= floor && received <= ceiling;
      if (pass) {
        return {
          message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
          pass: true
        };
      } else {
        return {
          message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
          pass: false
        };
      }
    }
  });
});

// Global teardown
afterAll(async () => {
  console.log('Finishing test suite...');
  
  try {
    // Close database connections
    await db.end();
    console.log('Database connections closed');
    
    // Close Redis connections
    if (redisMock.quit) {
      await redisMock.quit();
      console.log('Redis connections closed');
    }
    
    // Teardown test database
    await teardownTestDatabase();
    console.log('Test database teardown complete');
  } catch (error) {
    console.error('Error during test teardown:', error);
  }
  
  // Add a small delay to ensure all connections are properly closed
  await new Promise(resolve => setTimeout(resolve, 500));
});
