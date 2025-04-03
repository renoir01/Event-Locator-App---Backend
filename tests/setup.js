const db = require('../src/config/database');
const { Pool } = require('pg');
const redis = require('../src/config/redis');

// Create a separate admin connection to create the test database
const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Renoir@654',
});

// Setup function to prepare the test database
async function setupTestDatabase() {
  let adminClient;
  
  try {
    console.log('Setting up test database...');
    
    // Get admin client
    adminClient = await adminPool.connect();
    
    // Check if test database exists, if not create it
    const dbExistsResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME]
    );
    
    if (dbExistsResult.rows.length === 0) {
      console.log(`Creating test database: ${process.env.DB_NAME}`);
      // Disconnect any existing connections
      await adminClient.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `, [process.env.DB_NAME]);
      
      // Create the database
      await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      
      // Close admin client
      adminClient.release();
      
      // Connect to the new database to set up PostGIS
      const testDbPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        database: process.env.DB_NAME,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Renoir@654',
      });
      
      const testDbClient = await testDbPool.connect();
      
      // Create PostGIS extension
      await testDbClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
      
      // Create basic schema
      await testDbClient.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name_en VARCHAR(100) NOT NULL UNIQUE,
          name_rw VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          preferred_language VARCHAR(10) DEFAULT 'en',
          location GEOGRAPHY(POINT),
          notification_radius INTEGER DEFAULT 10,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          location GEOGRAPHY(POINT) NOT NULL,
          address VARCHAR(255) NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          max_participants INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS event_participants (
          id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'registered',
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS ratings (
          id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          content JSONB NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS user_preferences_categories (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, category_id)
        );
      `);
      
      // Insert test categories
      await testDbClient.query(`
        INSERT INTO categories (name_en, name_rw)
        VALUES 
          ('Test Category 1', 'Test Category 1 RW'),
          ('Test Category 2', 'Test Category 2 RW')
        ON CONFLICT (name_en) DO NOTHING
      `);
      
      testDbClient.release();
      await testDbPool.end();
    } else {
      adminClient.release();
      
      // Clean up any test data from previous runs
      await db.query(`DELETE FROM event_participants WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await db.query(`DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await db.query(`DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await db.query(`DELETE FROM user_preferences_categories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await db.query(`DELETE FROM events WHERE title LIKE '%Test%'`);
      await db.query(`DELETE FROM users WHERE email LIKE '%test%'`);
      
      // Insert test categories if they don't exist
      await db.query(`
        INSERT INTO categories (name_en, name_rw)
        VALUES 
          ('Test Category 1', 'Test Category 1 RW'),
          ('Test Category 2', 'Test Category 2 RW')
        ON CONFLICT (name_en) DO NOTHING
      `);
    }
    
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    if (adminClient) adminClient.release();
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Teardown function to clean up after tests
async function teardownTestDatabase() {
  try {
    console.log('Cleaning up test database...');
    
    // Clean up test data
    await db.query(`DELETE FROM event_participants WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await db.query(`DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await db.query(`DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await db.query(`DELETE FROM user_preferences_categories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await db.query(`DELETE FROM events WHERE title LIKE '%Test%'`);
    await db.query(`DELETE FROM users WHERE email LIKE '%test%'`);
    
    // Close Redis connection but don't close the database connection
    // as it's needed for other tests and will be closed by Jest when all tests complete
    await redis.quit();
    
    console.log('Test database cleanup complete');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
}

module.exports = {
  setupTestDatabase,
  teardownTestDatabase
};
