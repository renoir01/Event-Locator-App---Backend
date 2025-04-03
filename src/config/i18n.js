const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(Backend)
  .init({
    fallbackLng: process.env.DEFAULT_LANGUAGE || 'en',
    preload: ['en', 'rw'],
    ns: ['common', 'auth', 'events', 'validation'],
    defaultNS: 'common',
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    },
    interpolation: {
      escapeValue: false
    }
  });

module.exports = i18next;
