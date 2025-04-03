/**
 * Script to set up the event_locator database in PostgreSQL 13 with PostGIS
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔧 Setting up event_locator database in PostgreSQL 13 with PostGIS...');
  
  // Connect to PostgreSQL 13 default database
  const defaultPool = new Pool({
    host: 'localhost',
    port: 5433,  // PostgreSQL 13 is running on port 5433
    database: 'postgres', // Connect to default database first
    user: 'postgres',
    password: 'Renoir@654',
  });

  try {
    // Check if event_locator database exists
    const dbCheckResult = await defaultPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'event_locator'"
    );
    
    if (dbCheckResult.rowCount === 0) {
      console.log('🔄 Creating event_locator database...');
      await defaultPool.query('CREATE DATABASE event_locator');
      console.log('✅ event_locator database created successfully.');
    } else {
      console.log('ℹ️ event_locator database already exists.');
    }
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  } finally {
    await defaultPool.end();
  }

  // Connect to the event_locator database
  const appPool = new Pool({
    host: 'localhost',
    port: 5433,  // PostgreSQL 13 is running on port 5433
    database: 'event_locator',
    user: 'postgres',
    password: 'Renoir@654',
  });

  try {
    // Create migrations table if it doesn't exist
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if PostGIS extension is installed
    const postgisCheck = await appPool.query("SELECT 1 FROM pg_extension WHERE extname = 'postgis'");
    
    if (postgisCheck.rowCount === 0) {
      console.log('🔄 Installing PostGIS extension...');
      await appPool.query('CREATE EXTENSION postgis');
      console.log('✅ PostGIS extension installed successfully.');
      
      // Set environment variable for the application
      console.log('ℹ️ PostGIS is available. Set POSTGIS_AVAILABLE=true in your .env file.');
    } else {
      console.log('ℹ️ PostGIS extension is already installed.');
    }

    // Get PostGIS version
    const postgisVersionResult = await appPool.query('SELECT PostGIS_Version()');
    console.log('📊 PostGIS Version:');
    console.log(postgisVersionResult.rows[0].postgis_version);

    console.log('✅ Database setup completed successfully.');
    console.log('');
    console.log('🔔 Next steps:');
    console.log('1. Update your .env file to use PostgreSQL 13:');
    console.log('   DB_PORT=5433');
    console.log('   POSTGIS_AVAILABLE=true');
    console.log('2. Run your database migrations:');
    console.log('   node src/database/setup-db.js');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
  } finally {
    await appPool.end();
  }
}

// Run the setup
setupDatabase();
