require('dotenv').config();
const express = require('express');
const cors = require('cors');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextBackend = require('i18next-fs-backend');
const path = require('path');
const fs = require('fs'); // Added fs module
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Initialize i18n
i18next
  .use(i18nextBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}.json'),
    },
    fallbackLng: process.env.DEFAULT_LANGUAGE || 'en',
    preload: ['en', 'rw'],
    ns: ['common'],
    defaultNS: 'common'
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(i18nextMiddleware.handle(i18next));

// Serve static files with dynamic API key injection
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading index.html:', err);
            return res.status(500).send('Error loading page');
        }
        
        // Replace the API key placeholder
        const html = data.replace('YOUR_API_KEY', process.env.GOOGLE_MAPS_API_KEY);
        res.send(html);
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
