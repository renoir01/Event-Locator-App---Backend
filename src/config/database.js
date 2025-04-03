const { Pool } = require('pg');
const logger = require('./logger');

// Ensure password is always passed as a string
const dbPassword = process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : 'Renoir@654';

// Log database connection details in development mode
if (process.env.NODE_ENV === 'development') {
  logger.debug('Database connection details:', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'event_locator',
    user: process.env.DB_USER || 'postgres',
    // Don't log the actual password
    passwordProvided: !!process.env.DB_PASSWORD
  });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'event_locator',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword,
  // Add connection timeout and max clients for better stability
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Add event listeners for connection issues
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

pool.on('connect', (client) => {
  logger.info('New client connected to PostgreSQL');
  // Ensure PostGIS extension is available
  client.query('CREATE EXTENSION IF NOT EXISTS postgis', (err) => {
    if (err) {
      logger.error('Error creating PostGIS extension:', err.message);
    } else {
      logger.info('PostGIS extension is available');
    }
  });
});

// Add a connect function to test the connection
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    
    // Test PostGIS functionality
    const postgisTest = await client.query('SELECT PostGIS_Version()');
    if (postgisTest.rows && postgisTest.rows.length > 0) {
      logger.info(`Connected to database with PostGIS version: ${postgisTest.rows[0].postgis_version}`);
    } else {
      logger.warn('PostGIS extension might not be properly installed');
    }
    
    logger.info(`Successfully connected to database: ${process.env.DB_NAME || 'event_locator'}`);
    return true;
  } catch (error) {
    logger.error('Error connecting to database:', error.message);
    return false;
  } finally {
    if (client) client.release();
  }
};

// Improved query function with better error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      logger.warn(`Slow query (${duration}ms): ${text}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Query error: ${error.message}`, {
      query: text,
      params: JSON.stringify(params),
      error: error.stack
    });
    throw error;
  }
};

module.exports = {
  query,
  end: () => pool.end(),
  getClient: () => pool.connect(),
  testConnection
};
