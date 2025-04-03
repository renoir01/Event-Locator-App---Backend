/**
 * Database Migration Runner
 * Applies SQL migration files to the database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const db = require('../config/database');

// Path to migration files
const migrationsDir = path.join(__dirname, 'migrations');

async function runMigration(filePath) {
  console.log(`Running migration: ${path.basename(filePath)}`);
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL
    await db.query(sql);
    
    console.log(`✅ Migration successful: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${path.basename(filePath)}`);
    console.error(error);
    return false;
  }
}

async function runAllMigrations() {
  console.log('Starting database migrations...');
  
  // Get all SQL files in the migrations directory
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(migrationsDir, file));
  
  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }
  
  console.log(`Found ${files.length} migration files.`);
  
  // Run each migration
  let successCount = 0;
  for (const file of files) {
    const success = await runMigration(file);
    if (success) successCount++;
  }
  
  console.log(`Migrations completed: ${successCount}/${files.length} successful.`);
}

// Run migrations
runAllMigrations()
  .then(() => {
    console.log('Migration process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during migration process:', err);
    process.exit(1);
  });
