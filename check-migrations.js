/**
 * Script to check the migrations table status
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkMigrations() {
  console.log('🔍 Checking migrations table status...');
  
  // Connect to the event_locator database
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'event_locator',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Renoir@654',
  });

  try {
    // Check if migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Migrations table exists.');
      
      // Get all migrations
      const migrations = await pool.query('SELECT * FROM migrations ORDER BY applied_at');
      
      if (migrations.rowCount > 0) {
        console.log('\n📋 Applied migrations:');
        migrations.rows.forEach(row => {
          console.log(`- ${row.name} (applied at: ${row.applied_at})`);
        });
      } else {
        console.log('\n❌ No migrations have been applied yet.');
      }
    } else {
      console.log('❌ Migrations table does not exist.');
    }
    
    // Check existing tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Existing tables:');
    if (tables.rowCount > 0) {
      tables.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    } else {
      console.log('No tables found in the database.');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking migrations:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the check
checkMigrations();
