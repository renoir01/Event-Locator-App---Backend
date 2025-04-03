const Redis = require('redis');
const { promisify } = require('util');

// Use mock implementation for testing
if (process.env.NODE_ENV === 'test') {
  const mockClient = {
    publish: jest.fn(),
    subscribe: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    duplicate: () => ({
      publish: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn(),
      quit: jest.fn()
    })
  };
  
  module.exports = mockClient;
} else {
  // Real Redis client for development and production
  const redisClient = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retry_strategy: function(options) {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error
        console.warn('Redis connection refused. Using fallback client.');
        return false;
      }
      if (options.total_retry_time > 1000 * 60) {
        // End reconnecting after a specific timeout
        console.warn('Redis retry time exhausted. Using fallback client.');
        return false;
      }
      // Reconnect after increasing delay with a maximum of 3 seconds
      return Math.min(options.attempt * 100, 3000);
    },
    connect_timeout: 5000 // 5 seconds timeout for initial connection
  });

  // Promisify Redis methods for better async handling
  const asyncPublish = promisify(redisClient.publish).bind(redisClient);

  redisClient.on('error', (err) => {
    console.warn('Redis Client Error:', err.message);
    // Continue application without Redis if there's an error
  });

  redisClient.on('connect', () => {
    console.log('Redis client connected successfully');
  });

  // Create a more robust fallback client that doesn't throw errors for publish/subscribe
  const fallbackClient = {
    publish: async (channel, message) => {
      // Ensure message is properly stringified if it's an object
      const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
      console.warn(`Redis unavailable. Would have published to ${channel}: ${messageStr}`);
      return Promise.resolve(); // Resolve immediately
    },
    subscribe: (channel, callback) => {
      console.warn(`Redis unavailable. Would have subscribed to ${channel}`);
      return Promise.resolve();
    },
    on: (event, callback) => {
      console.warn(`Redis unavailable. Would have registered listener for ${event}`);
      return fallbackClient;
    },
    quit: () => {
      console.warn('Redis unavailable. Quit operation ignored.');
      return Promise.resolve();
    },
    duplicate: () => fallbackClient,
    connected: false
  };

  // Enhanced client with better error handling
  const enhancedClient = {
    publish: async (channel, message) => {
      try {
        if (redisClient.connected) {
          return await asyncPublish(channel, message);
        } else {
          return await fallbackClient.publish(channel, message);
        }
      } catch (error) {
        console.warn('Redis publish error:', error.message);
        return fallbackClient.publish(channel, message);
      }
    },
    subscribe: redisClient.connected ? redisClient.subscribe.bind(redisClient) : fallbackClient.subscribe,
    on: redisClient.connected ? redisClient.on.bind(redisClient) : fallbackClient.on,
    quit: redisClient.connected ? redisClient.quit.bind(redisClient) : fallbackClient.quit,
    duplicate: redisClient.connected ? redisClient.duplicate.bind(redisClient) : fallbackClient.duplicate,
    connected: redisClient.connected
  };

  // Export the enhanced client
  module.exports = enhancedClient;
}
