// Test script to verify database connection
require('dotenv').config({ path: '.env.test' });
const db = require('../src/config/database');

// Force logger to use console transport for this test
// logger.transports.forEach(t => {
//   if (t.name === 'console') {
//     t.level = 'debug';
//   }
// });

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database configuration:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      passwordProvided: !!process.env.DB_PASSWORD
    });

    // Test the connection
    let client;
    try {
      client = await db.pool.connect();
      console.log(`Successfully connected to database: ${process.env.DB_NAME}`);
      
      // Try a simple query
      const result = await client.query('SELECT NOW() as current_time');
      console.log('Database query successful:', result.rows[0]);
      
      // Check if PostGIS is available
      const postgisResult = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'postgis'");
      const postgisAvailable = postgisResult.rows.length > 0;
      console.log(`PostGIS extension available: ${postgisAvailable}`);
      
      // List all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('Available tables:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
      
      console.log('Database connection test completed successfully');
    } catch (error) {
      console.error('Error during database connection test:', error.message);
      console.error('Full error:', error);
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    console.error('Error setting up database test:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the test
testDatabaseConnection();
