/**
 * Script to check PostGIS availability in the database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkPostGIS() {
  console.log('🔍 Checking PostgreSQL 16 and PostGIS status...');
  
  // Connect to the database using credentials from .env but specify PostgreSQL 16
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Renoir@654',
  });

  try {
    // Check PostgreSQL version
    const pgVersionResult = await pool.query('SELECT version()');
    console.log('\n📊 PostgreSQL Version:');
    console.log(pgVersionResult.rows[0].version);
    
    // Check if PostGIS extension exists
    const postgisCheckResult = await pool.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'postgis'"
    );
    
    if (postgisCheckResult.rowCount > 0) {
      console.log('\n✅ PostGIS extension is installed.');
      
      // Get PostGIS version
      const postgisVersionResult = await pool.query('SELECT PostGIS_Version()');
      console.log('\n📊 PostGIS Version:');
      console.log(postgisVersionResult.rows[0].postgis_version);
    } else {
      console.log('\n❌ PostGIS extension is NOT installed in the default database.');
      
      // Check if PostGIS is available to be installed
      const availableExtensions = await pool.query(
        "SELECT name FROM pg_available_extensions WHERE name = 'postgis'"
      );
      
      if (availableExtensions.rowCount > 0) {
        console.log('\n✅ PostGIS is available to be installed.');
        console.log('You can install it with: CREATE EXTENSION postgis;');
      } else {
        console.log('\n❌ PostGIS is NOT available to be installed.');
      }
    }
    
    // Check available extensions
    const availableExtensions = await pool.query(
      "SELECT name FROM pg_available_extensions WHERE name LIKE 'postgis%'"
    );
    
    console.log('\n📋 Available PostGIS-related extensions:');
    if (availableExtensions.rowCount > 0) {
      availableExtensions.rows.forEach(row => {
        console.log(`- ${row.name}`);
      });
    } else {
      console.log('No PostGIS-related extensions available.');
      console.log('You may need to install PostGIS on your system first.');
    }
    
    // Check installed extensions
    const installedExtensions = await pool.query(
      "SELECT extname FROM pg_extension WHERE extname LIKE 'postgis%'"
    );
    
    console.log('\n📋 Installed PostGIS-related extensions:');
    if (installedExtensions.rowCount > 0) {
      installedExtensions.rows.forEach(row => {
        console.log(`- ${row.extname}`);
      });
    } else {
      console.log('No PostGIS-related extensions are currently installed.');
    }
    
    // Check if the event_locator database exists
    const dbCheckResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'event_locator'"
    );
    
    if (dbCheckResult.rowCount > 0) {
      console.log('\n✅ event_locator database exists.');
      
      // Connect to event_locator database to check for PostGIS there
      await pool.end();
      
      const eventLocatorPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'event_locator',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Renoir@654',
      });
      
      try {
        // Check if PostGIS extension exists in event_locator
        const postgisCheckResult = await eventLocatorPool.query(
          "SELECT 1 FROM pg_extension WHERE extname = 'postgis'"
        );
        
        if (postgisCheckResult.rowCount > 0) {
          console.log('✅ PostGIS extension is installed in event_locator database.');
          
          // Get PostGIS version
          const postgisVersionResult = await eventLocatorPool.query('SELECT PostGIS_Version()');
          console.log('📊 PostGIS Version in event_locator:');
          console.log(postgisVersionResult.rows[0].postgis_version);
        } else {
          console.log('❌ PostGIS extension is NOT installed in event_locator database.');
        }
      } catch (error) {
        console.error('❌ Error checking PostGIS in event_locator:', error.message);
      } finally {
        await eventLocatorPool.end();
      }
    } else {
      console.log('\n❌ event_locator database does not exist in PostgreSQL 16.');
    }
    
  } catch (error) {
    console.error('\n❌ Error connecting to the database:', error.message);
    console.error('Please check your database credentials and connection.');
  } finally {
    await pool.end();
  }
}

// Run the check
checkPostGIS();
