require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Set environment variables for testing
process.env.NODE_ENV = 'test';

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'event_locator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  try {
    // Create core tables
    await createCoreTables();
    
    // Create indexes and triggers
    await createIndexesAndTriggers();
    
    // Insert test data
    await insertTestData();
    
    console.log('Test database setup completed successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createCoreTables() {
  console.log('Creating core tables...');
  
  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      preferred_language VARCHAR(10) DEFAULT 'en',
      latitude FLOAT,
      longitude FLOAT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create categories table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name_en VARCHAR(100) NOT NULL,
      name_rw VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create events table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      latitude FLOAT NOT NULL,
      longitude FLOAT NOT NULL,
      start_date TIMESTAMP WITH TIME ZONE NOT NULL,
      end_date TIMESTAMP WITH TIME ZONE NOT NULL,
      creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      address TEXT NOT NULL,
      max_participants INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create user_preferences table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      notification_radius INTEGER DEFAULT 10,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id)
    )
  `);
  
  // Create user_category_preferences table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_category_preferences (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, category_id)
    )
  `);
  
  // Create event_participants table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_participants (
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'registered',
      registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id)
    )
  `);
  
  // Create participants table (alias for event_participants)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS participants (
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'registered',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id)
    )
  `);
  
  // Create event_ratings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_ratings (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      review TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (event_id, user_id)
    )
  `);
  
  // Create favorite_events table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorite_events (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, event_id)
    )
  `);
  
  // Create notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Core tables created successfully');
}

async function createIndexesAndTriggers() {
  console.log('Creating indexes and triggers...');
  
  // Create indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date)`);
  
  // Check if event_participants table exists and has status column before creating index
  try {
    const { rows } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'event_participants' AND column_name = 'status'
    `);
    
    if (rows.length > 0) {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status)`);
    }
  } catch (error) {
    console.log('Skipping event_participants index creation:', error.message);
  }
  
  // Create updated_at function
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);
  
  // Create triggers
  await pool.query(`
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  `);
  
  await pool.query(`
    DROP TRIGGER IF EXISTS update_events_updated_at ON events;
    CREATE TRIGGER update_events_updated_at
      BEFORE UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  `);
  
  console.log('Indexes and triggers created successfully');
}

async function insertTestData() {
  console.log('Inserting test data...');
  
  // Insert test categories
  await pool.query(`
    INSERT INTO categories (id, name_en, name_rw)
    VALUES 
      (1, 'Music', 'Umuziki'),
      (2, 'Sports', 'Siporo'),
      (3, 'Technology', 'Ikoranabuhanga'),
      (4, 'Food', 'Ibiryo'),
      (5, 'Art', 'Ubugeni')
    ON CONFLICT (id) DO UPDATE 
    SET name_en = EXCLUDED.name_en, name_rw = EXCLUDED.name_rw
  `);
  
  console.log('Test data inserted successfully');
}

// Run the setup
setupTestDatabase();
