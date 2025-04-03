/**
 * Database Setup Script
 * Creates the database if it doesn't exist and runs all migrations
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connect to postgres database to create our app database
const setupPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  console.log('🔧 Setting up database...');
  
  try {
    // Check if database exists
    const checkResult = await setupPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME]
    );
    
    // Create database if it doesn't exist
    if (checkResult.rowCount === 0) {
      console.log(`Database '${process.env.DB_NAME}' does not exist. Creating...`);
      await setupPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`✅ Database '${process.env.DB_NAME}' created successfully.`);
    } else {
      console.log(`✅ Database '${process.env.DB_NAME}' already exists.`);
    }
    
    // Close the setup connection
    await setupPool.end();
    
    // Connect to the app database to run migrations
    const appPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    // Try to install PostGIS extension if available
    let postgisAvailable = process.env.POSTGIS_AVAILABLE === 'true';
    console.log('Checking PostGIS extension...');
    try {
      // Check if PostGIS is already installed
      const postgisCheck = await appPool.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'postgis'"
      );
      
      if (postgisCheck.rowCount === 0) {
        console.log('Attempting to install PostGIS extension...');
        try {
          await appPool.query('CREATE EXTENSION IF NOT EXISTS postgis');
          await appPool.query('CREATE EXTENSION IF NOT EXISTS postgis_topology');
          console.log('✅ PostGIS extension installed successfully.');
          postgisAvailable = true;
        } catch (error) {
          console.log('⚠️ PostGIS extension not available. Using fallback location handling.');
          console.log('  To enable full geospatial features, please install PostGIS on your PostgreSQL server.');
          postgisAvailable = false;
        }
      } else {
        console.log('✅ PostGIS extension already installed.');
        postgisAvailable = true;
      }
    } catch (error) {
      console.log('⚠️ Unable to check for PostGIS. Using fallback location handling.');
      postgisAvailable = false;
    }
    
    // Set environment variable to indicate PostGIS availability
    process.env.POSTGIS_AVAILABLE = postgisAvailable;
    
    // Create a migrations table if it doesn't exist to track which migrations have been run
    try {
      await appPool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Add unique constraint if it doesn't exist
      const constraintCheck = await appPool.query(`
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'migrations_name_key' 
        AND conrelid = 'migrations'::regclass
      `);
      
      if (constraintCheck.rowCount === 0) {
        await appPool.query(`
          ALTER TABLE migrations ADD CONSTRAINT migrations_name_key UNIQUE (name)
        `);
      }
    } catch (error) {
      console.error('Error creating migrations table:', error.message);
    }
    
    // Get list of already applied migrations
    const appliedMigrations = new Set();
    try {
      const { rows } = await appPool.query('SELECT name FROM migrations');
      rows.forEach(row => appliedMigrations.add(row.name));
    } catch (error) {
      console.error('Error fetching applied migrations:', error.message);
    }
    
    // Run migrations
    console.log('Running migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // First, check if we need to drop all tables and start fresh
    const shouldDropTables = false; // Set to true if you want to drop all tables and start fresh
    
    if (shouldDropTables) {
      console.log('⚠️ Dropping all existing tables...');
      try {
        // Get all tables except PostGIS-related tables
        const { rows } = await appPool.query(`
          SELECT tablename FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
        `);
        
        // Drop each table
        for (const row of rows) {
          await appPool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        }
        
        // Clear migrations table
        await appPool.query('DELETE FROM migrations');
        
        console.log('✅ All tables dropped successfully.');
        appliedMigrations.clear();
      } catch (error) {
        console.error('Error dropping tables:', error.message);
      }
    }
    
    // Define migration order explicitly
    const orderedMigrations = [
      '000_postgis_extension.sql',
      '001_initial_schema.sql',
      '001_simple_schema.sql',
      '002_notifications.sql',
      '002_user_category_preferences.sql',
      'favorites_table.sql',
      'user_preferences_table.sql'
    ];
    
    // Filter migrations based on PostGIS availability and what's already been applied
    let migrationFiles = [];
    
    if (postgisAvailable) {
      // PostGIS is available, use the PostGIS schema
      migrationFiles = orderedMigrations.filter(file => 
        !file.includes('simple_schema') && 
        !appliedMigrations.has(file)
      );
    } else {
      // PostGIS is not available, use the simple schema
      migrationFiles = orderedMigrations.filter(file => 
        !file.includes('postgis') && 
        !file.includes('initial_schema') && 
        !appliedMigrations.has(file)
      );
    }
    
    // Add any other migrations that aren't in our ordered list
    const otherMigrations = fs.readdirSync(migrationsDir)
      .filter(file => 
        file.endsWith('.sql') && 
        !orderedMigrations.includes(file) &&
        !appliedMigrations.has(file)
      )
      .sort();
    
    migrationFiles = [...migrationFiles, ...otherMigrations];
    
    if (migrationFiles.length === 0) {
      console.log('✅ No new migrations to apply.');
    }
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      
      // Skip if file doesn't exist
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Migration file not found: ${file}. Skipping.`);
        continue;
      }
      
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        // Start a transaction for each migration
        await appPool.query('BEGIN');
        
        // Run the migration
        await appPool.query(sql);
        
        // Record the migration as applied
        await appPool.query(
          'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [file]
        );
        
        // Commit the transaction
        await appPool.query('COMMIT');
        
        console.log(`✅ Migration successful: ${file}`);
      } catch (error) {
        // Rollback on error
        await appPool.query('ROLLBACK');
        console.error(`❌ Migration failed: ${file}`);
        console.error(error.message);
        // Continue with other migrations even if one fails
      }
    }
    
    // Close the app connection
    await appPool.end();
    
    console.log('🚀 Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
