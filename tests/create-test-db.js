// Script to create the test database
require('dotenv').config({ path: '.env.test' });
const { Pool } = require('pg');

async function createTestDatabase() {
  // Connect to default postgres database
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Renoir@654',
  });

  let adminClient;
  let testDbPool;

  try {
    console.log('Creating test database...');
    
    // Get admin client
    adminClient = await adminPool.connect();
    
    // Check if test database exists
    const dbExistsResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME]
    );
    
    if (dbExistsResult.rows.length === 0) {
      console.log(`Test database '${process.env.DB_NAME}' does not exist. Creating it now...`);
      
      // Disconnect any existing connections
      await adminClient.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `, [process.env.DB_NAME]);
      
      // Create the database
      await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Test database '${process.env.DB_NAME}' created successfully.`);
      
      // Close admin client
      adminClient.release();
      
      // Connect to the new database to set up PostGIS
      testDbPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        database: process.env.DB_NAME,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Renoir@654',
      });
      
      const testDbClient = await testDbPool.connect();
      
      // Create PostGIS extension
      console.log('Setting up PostGIS extension...');
      await testDbClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
      console.log('PostGIS extension created successfully.');
      
      // Create basic schema
      console.log('Creating basic schema...');
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
        
        -- Add the user_preferences table
        CREATE TABLE IF NOT EXISTS user_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES categories(id),
          notification_radius FLOAT NOT NULL DEFAULT 5.0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        );
        
        -- Add the user_category_preferences table
        CREATE TABLE IF NOT EXISTS user_category_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, category_id)
        );
        
        -- Add favorite_events table
        CREATE TABLE IF NOT EXISTS favorite_events (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, event_id)
        );
        
        -- Add event_notifications table
        CREATE TABLE IF NOT EXISTS event_notifications (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, user_id)
        );
        
        -- Create indexes for faster queries
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_preferences_category_id ON user_preferences(category_id);
        CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id ON user_category_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_category_preferences_category_id ON user_category_preferences(category_id);
        CREATE INDEX IF NOT EXISTS idx_favorite_events_user_id ON favorite_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_favorite_events_event_id ON favorite_events(event_id);
        CREATE INDEX IF NOT EXISTS idx_event_notifications_user_id ON event_notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_event_notifications_event_id ON event_notifications(event_id);
      `);
      console.log('Basic schema created successfully.');
      
      // Insert test categories
      console.log('Inserting test categories...');
      await testDbClient.query(`
        INSERT INTO categories (name_en, name_rw)
        VALUES 
          ('Test Category 1', 'Test Category 1 RW'),
          ('Test Category 2', 'Test Category 2 RW')
        ON CONFLICT (name_en) DO NOTHING
      `);
      console.log('Test categories inserted successfully.');
      
      testDbClient.release();
    } else {
      console.log(`Test database '${process.env.DB_NAME}' already exists.`);
      adminClient.release();
      
      // Connect to the existing database to ensure all tables exist
      testDbPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        database: process.env.DB_NAME,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Renoir@654',
      });
      
      const testDbClient = await testDbPool.connect();
      
      // Check and create missing tables
      console.log('Checking for missing tables...');
      
      // Check if user_preferences table exists
      const userPrefsExists = await testDbClient.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences'"
      );
      
      if (userPrefsExists.rows.length === 0) {
        console.log('Creating missing user_preferences table...');
        await testDbClient.query(`
          CREATE TABLE IF NOT EXISTS user_preferences (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category_id INTEGER REFERENCES categories(id),
            notification_radius FLOAT NOT NULL DEFAULT 5.0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_preferences_category_id ON user_preferences(category_id);
        `);
        console.log('user_preferences table created successfully.');
      }
      
      // Check if user_category_preferences table exists
      const userCatPrefsExists = await testDbClient.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_category_preferences'"
      );
      
      if (userCatPrefsExists.rows.length === 0) {
        console.log('Creating missing user_category_preferences table...');
        await testDbClient.query(`
          CREATE TABLE IF NOT EXISTS user_category_preferences (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id ON user_category_preferences(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_category_preferences_category_id ON user_category_preferences(category_id);
        `);
        console.log('user_category_preferences table created successfully.');
      }
      
      // Check if favorite_events table exists
      const favoriteEventsExists = await testDbClient.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorite_events'"
      );
      
      if (favoriteEventsExists.rows.length === 0) {
        console.log('Creating missing favorite_events table...');
        await testDbClient.query(`
          CREATE TABLE IF NOT EXISTS favorite_events (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, event_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_favorite_events_user_id ON favorite_events(user_id);
          CREATE INDEX IF NOT EXISTS idx_favorite_events_event_id ON favorite_events(event_id);
        `);
        console.log('favorite_events table created successfully.');
      }
      
      // Check if event_notifications table exists
      const eventNotificationsExists = await testDbClient.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_notifications'"
      );
      
      if (eventNotificationsExists.rows.length === 0) {
        console.log('Creating missing event_notifications table...');
        await testDbClient.query(`
          CREATE TABLE IF NOT EXISTS event_notifications (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, user_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_event_notifications_user_id ON event_notifications(user_id);
          CREATE INDEX IF NOT EXISTS idx_event_notifications_event_id ON event_notifications(event_id);
        `);
        console.log('event_notifications table created successfully.');
      }
      
      // Clean up any test data from previous runs
      await testDbClient.query(`DELETE FROM event_participants WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM user_preferences_categories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM user_category_preferences WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM favorite_events WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM event_notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
      await testDbClient.query(`DELETE FROM events WHERE title LIKE '%Test%'`);
      await testDbClient.query(`DELETE FROM users WHERE email LIKE '%test%'`);
      
      // Insert test categories if they don't exist
      await testDbClient.query(`
        INSERT INTO categories (name_en, name_rw)
        VALUES 
          ('Test Category 1', 'Test Category 1 RW'),
          ('Test Category 2', 'Test Category 2 RW')
        ON CONFLICT (name_en) DO NOTHING
      `);
      
      testDbClient.release();
    }
    
    console.log('Test database setup complete.');
  } catch (error) {
    console.error('Error setting up test database:', error);
    if (adminClient) adminClient.release();
    throw error;
  } finally {
    await adminPool.end();
    if (testDbPool) await testDbPool.end();
  }
}

// Run the function
createTestDatabase()
  .then(() => console.log('Done'))
  .catch(err => console.error('Failed:', err));
