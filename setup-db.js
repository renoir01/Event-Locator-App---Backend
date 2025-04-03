/**
 * Database setup script for Event Locator App
 * - Creates database if it doesn't exist
 * - Installs PostGIS extension
 * - Sets up initial schema
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('./src/config/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Renoir@654',
};

// Target database name
const DB_NAME = process.env.DB_NAME || 'event_locator';

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  // Connect to default postgres database first
  const adminPool = new Pool({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    // Check if our database exists
    const dbCheckResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );
    
    // Create database if it doesn't exist
    if (dbCheckResult.rowCount === 0) {
      console.log(`\n📦 Creating database '${DB_NAME}'...`);
      await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Database '${DB_NAME}' created successfully.`);
    } else {
      console.log(`\n✅ Database '${DB_NAME}' already exists.`);
    }
    
    // Close connection to postgres database
    await adminPool.end();
    
    // Connect to our application database
    const appPool = new Pool({
      ...dbConfig,
      database: DB_NAME,
    });
    
    // Check if PostGIS extension exists
    const postgisCheckResult = await appPool.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'postgis'"
    );
    
    // Install PostGIS if needed
    if (postgisCheckResult.rowCount === 0) {
      console.log('\n📦 Installing PostGIS extension...');
      try {
        await appPool.query('CREATE EXTENSION IF NOT EXISTS postgis');
        console.log('✅ PostGIS extension installed successfully.');
      } catch (error) {
        console.error('❌ Failed to install PostGIS extension:', error.message);
        console.log('Please ensure PostGIS is installed on your system.');
        console.log('On Windows: https://postgis.net/windows_downloads/');
        console.log('On Linux: sudo apt install postgis postgresql-16-postgis-3');
        console.log('On macOS: brew install postgis');
      }
    } else {
      console.log('\n✅ PostGIS extension is already installed.');
    }
    
    // Get PostGIS version
    try {
      const postgisVersionResult = await appPool.query('SELECT PostGIS_Version()');
      console.log('\n📊 PostGIS Version:');
      console.log(postgisVersionResult.rows[0].postgis_version);
    } catch (error) {
      console.warn('⚠️ Could not get PostGIS version:', error.message);
    }
    
    // Apply schema
    console.log('\n📦 Setting up database schema...');
    const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    try {
      await appPool.query(schemaSQL);
      console.log('✅ Database schema applied successfully.');
    } catch (error) {
      console.error('❌ Error applying schema:', error.message);
      
      // Try to apply schema in separate transactions
      console.log('⚠️ Trying to apply schema in separate statements...');
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      let successCount = 0;
      for (const stmt of statements) {
        try {
          await appPool.query(stmt + ';');
          successCount++;
        } catch (stmtError) {
          console.warn(`⚠️ Statement failed: ${stmt.substring(0, 50)}...`);
          console.warn(`   Error: ${stmtError.message}`);
        }
      }
      
      console.log(`✅ Applied ${successCount}/${statements.length} schema statements.`);
    }
    
    // Close connection
    await appPool.end();
    
    console.log('\n🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupDatabase().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
