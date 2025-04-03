/**
 * Internationalization Module
 * Handles language switching and translation functionality
 */

// DOM Elements
const languageSelector = document.getElementById('languageSelector');

// Default language
let currentLanguage = getLanguageFromCookie() || 'en';

/**
 * Initialize internationalization module
 */
function initI18n() {
    if (languageSelector) {
        // Set initial language
        languageSelector.value = currentLanguage;
        
        // Add event listener for language change
        languageSelector.addEventListener('change', changeLanguage);
    }
    
    // Apply translations to the page
    applyTranslations();
}

/**
 * Handle language change event
 */
function changeLanguage(e) {
    const language = e.target.value;
    document.cookie = `language=${language}; path=/; max-age=31536000`; // 1 year
    currentLanguage = language;
    
    // Reload the page to apply new language
    location.reload();
}

/**
 * Get language from cookie
 */
function getLanguageFromCookie() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'language') {
            return value;
        }
    }
    return null;
}

/**
 * Apply translations to the page based on current language
 */
function applyTranslations() {
    // This function will be expanded with actual translations
    // For now, we're relying on server-side translations
    
    // Update document language attribute
    document.documentElement.lang = currentLanguage;
    
    // Example of how we could apply client-side translations
    // if we need to supplement server-side translations
    if (currentLanguage === 'rw') {
        updateElementText('loginBtn', 'Injira');
        updateElementText('registerBtn', 'Iyandikishe');
        updateElementText('searchBtn', 'Shakisha');
        updateElementText('events-tab', 'Ibikorwa');
        updateElementText('favorites-tab', 'Ibikunzwe');
        updateElementText('profile-tab', 'Umwirondoro');
    }
}

/**
 * Update text content of an element if it exists
 */
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

/**
 * Get translation for a key
 */
function t(key, defaultText) {
    // This is a simple implementation
    // In a real app, we would have a more robust translation system
    const translations = {
        'rw': {
            'login': 'Injira',
            'register': 'Iyandikishe',
            'search': 'Shakisha',
            'events': 'Ibikorwa',
            'favorites': 'Ibikunzwe',
            'profile': 'Umwirondoro',
            'save': 'Bika',
            'cancel': 'Hagarika',
            'success': 'Byagenze neza',
            'error': 'Habaye ikibazo',
            'loading': 'Gutegereza...',
            'no_favorites': 'Nta bikorwa watoranije',
            'add_favorite': 'Ongeraho',
            'remove_favorite': 'Kura',
            'register_event': 'Iyandikishe',
            'preferences': 'Ibyuhisemo',
            'notification_radius': 'Akarere k\'imenyesha',
            'preferred_category': 'Icyiciro wifuza',
            'save_preferences': 'Bika ibyuhisemo',
            'km': 'km'
        }
    };
    
    if (translations[currentLanguage] && translations[currentLanguage][key]) {
        return translations[currentLanguage][key];
    }
    
    return defaultText || key;
}

// Export functions for use in main.js
window.changeLanguage = changeLanguage;
window.getLanguageFromCookie = getLanguageFromCookie;
window.initI18n = initI18n;
window.t = t;
