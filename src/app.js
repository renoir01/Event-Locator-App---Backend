require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const { errorHandler } = require('./middleware/errorHandler');
const i18nMiddleware = require('./middleware/i18n.middleware');
const responseFormatter = require('./middleware/responseFormatter');
const { swaggerDocs } = require('./config/swagger');
const logger = require('./config/logger');
const db = require('./config/database');

const app = express();

// Test database connection on startup
db.testConnection()
  .then(connected => {
    if (connected) {
      logger.info('Database connection successful');
    } else {
      logger.error('Failed to connect to database');
    }
  })
  .catch(err => {
    logger.error('Database connection error:', err.message);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(i18nMiddleware);
app.use(responseFormatter);

// Add request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    authHeader: req.headers.authorization ? 'Present' : 'Not present'
  });
  next();
});

// Serve static files with dynamic API key injection
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            logger.error('Error reading index.html:', err);
            return res.status(500).send('Error loading page');
        }
        
        // Replace the API key placeholder
        const html = data.replace('YOUR_API_KEY', process.env.GOOGLE_MAPS_API_KEY || '');
        res.send(html);
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/favorites', require('./routes/favorites.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/categories', require('./routes/category.routes'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await db.testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Initialize Swagger documentation
swaggerDocs(app);

// API 404 handler - must come after API routes but before frontend routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      message: req.t ? req.t('error.not_found') : 'API endpoint not found',
      path: req.originalUrl
    }
  });
});

// Serve index.html for all other non-API routes (frontend routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling
app.use(errorHandler);

// Only start the server if this file is run directly (not imported in tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`Server running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
