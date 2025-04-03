const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const Backend = require('i18next-fs-backend');
const path = require('path');
const logger = require('../config/logger');

// Initialize i18next
i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: process.env.DEFAULT_LANGUAGE || 'en',
    preload: ['en', 'rw'],
    ns: ['common', 'auth', 'events', 'validation', 'notifications', 'ratings'],
    defaultNS: 'common',
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    },
    detection: {
      order: ['querystring', 'cookie', 'header', 'session'],
      lookupQuerystring: 'lang',
      lookupCookie: 'i18next',
      lookupHeader: 'accept-language',
      lookupSession: 'lang',
      caches: ['cookie']
    },
    interpolation: {
      escapeValue: false
    },
    debug: process.env.NODE_ENV === 'development',
    // Add language mapping to handle en-US -> en
    load: 'languageOnly',
    lowerCaseLng: true,
    // Map language variants to their base languages
    supportedLngs: ['en', 'rw'],
    nonExplicitSupportedLngs: true
  })
  .then(() => {
    logger.info('i18next initialized successfully');
    logger.info(`Available languages: ${i18next.languages.join(', ')}`);
    logger.info(`Default language: ${i18next.language}`);
  })
  .catch(error => {
    logger.error('Error initializing i18next:', error);
  });

// Function to convert detected language to supported language
function convertDetectedLanguage(lng) {
  if (lng.startsWith('en')) return 'en';
  if (lng.startsWith('rw')) return 'rw';
  return 'en'; // Default fallback
}

// Custom middleware to enhance i18n functionality
const enhancedI18nMiddleware = (req, res, next) => {
  // First apply the standard i18next middleware
  i18nextMiddleware.handle(i18next)(req, res, () => {
    // Convert detected language to supported language
    req.language = convertDetectedLanguage(req.language);
    
    // Add language helper to response locals for templates
    res.locals.language = req.language;
    res.locals.languages = i18next.languages;
    
    // Add language switcher helper
    res.locals.switchLanguage = (lang) => {
      const url = new URL(req.originalUrl, `http://${req.headers.host}`);
      url.searchParams.set('lang', lang);
      return url.pathname + url.search;
    };
    
    // Add translation helper that falls back gracefully
    req.t = (key, options) => {
      try {
        return req.t(key, options);
      } catch (error) {
        logger.warn(`Translation key not found: ${key}`);
        return key.split('.').pop();
      }
    };
    
    next();
  });
};

module.exports = enhancedI18nMiddleware;
