/**
 * User Preferences Module
 * Handles user preferences management and favorites functionality
 */

// DOM Elements
const preferencesForm = document.getElementById('preferencesForm');
const categorySelect = document.getElementById('categorySelect');
const notificationRadius = document.getElementById('notificationRadius');
const radiusValue = document.getElementById('radiusValue');
const favoritesList = document.getElementById('favoritesList');
const appTabs = document.getElementById('appTabs');

// State variables
let userPreferences = null;
let favoriteEvents = [];

/**
 * Initialize user preferences module
 */
function initUserPreferences() {
    // Add event listeners
    if (notificationRadius) {
        notificationRadius.addEventListener('input', () => {
            radiusValue.textContent = `${notificationRadius.value}km`;
        });
    }

    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handlePreferencesSubmit);
    }

    if (appTabs) {
        // Add event listener for tab changes
        appTabs.addEventListener('shown.bs.tab', function(event) {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#favorites-content') {
                loadFavoriteEvents();
            } else if (targetId === '#profile-content') {
                loadUserProfile();
            }
        });
    }

    // Load user data if logged in
    const token = localStorage.getItem('token');
    if (token) {
        Promise.all([
            getUserPreferences(),
            getFavoriteEvents()
        ]).catch(error => {
            console.error('Error initializing user preferences:', error);
        });
    }
}

/**
 * Get user preferences from the server
 */
async function getUserPreferences() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (response.ok && data.user && data.user.preferences) {
            userPreferences = data.user.preferences;
            
            // Update UI with user preferences
            if (categorySelect && userPreferences.categoryId) {
                categorySelect.value = userPreferences.categoryId;
            }
            
            if (notificationRadius && userPreferences.notificationRadius) {
                notificationRadius.value = userPreferences.notificationRadius;
                radiusValue.textContent = `${userPreferences.notificationRadius}km`;
            }

            return userPreferences;
        }
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        throw error;
    }
}

/**
 * Handle preferences form submission
 */
async function handlePreferencesSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginModal();
        return;
    }

    const categoryId = categorySelect.value;
    const radius = notificationRadius.value;

    try {
        await updateUserPreferences(categoryId, radius);
        showAlert('success', 'Preferences updated successfully!');
    } catch (error) {
        showAlert('danger', 'Failed to update preferences. Please try again.');
    }
}

/**
 * Update user preferences on the server
 */
async function updateUserPreferences(categoryId, notificationRadius) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/users/preferences', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categoryId: parseInt(categoryId),
                notificationRadius: parseFloat(notificationRadius)
            })
        });

        const data = await response.json();
        if (response.ok) {
            userPreferences = {
                categoryId: parseInt(categoryId),
                notificationRadius: parseFloat(notificationRadius)
            };
            return data;
        } else {
            throw new Error(data.error.message);
        }
    } catch (error) {
        console.error('Error updating user preferences:', error);
        throw error;
    }
}

/**
 * Get favorite events from the server
 */
async function getFavoriteEvents() {
    const token = localStorage.getItem('token');
    if (!token) return [];

    try {
        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            favoriteEvents = data.favorites || [];
            return favoriteEvents;
        } else {
            throw new Error(data.error.message);
        }
    } catch (error) {
        console.error('Error fetching favorite events:', error);
        return [];
    }
}

/**
 * Load and display favorite events
 */
async function loadFavoriteEvents() {
    const token = localStorage.getItem('token');
    if (!token || !favoritesList) {
        if (favoritesList) {
            favoritesList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning">
                        Please log in to view your favorite events.
                    </div>
                </div>
            `;
        }
        return;
    }

    try {
        favoritesList.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"></div></div>';
        
        const favorites = await getFavoriteEvents();
        displayFavoriteEvents(favorites);
    } catch (error) {
        console.error('Error loading favorite events:', error);
        favoritesList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error loading favorite events. Please try again.
                </div>
            </div>
        `;
    }
}

/**
 * Display favorite events in the UI
 */
function displayFavoriteEvents(events) {
    if (!favoritesList) return;
    
    if (!events || events.length === 0) {
        favoritesList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    You don't have any favorite events yet. Browse events and click the heart icon to add them to your favorites.
                </div>
            </div>
        `;
        return;
    }

    favoritesList.innerHTML = events.map(event => `
        <div class="col-md-4 mb-4">
            <div class="card event-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${event.title}</h5>
                    <p class="card-text">${event.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="rating">
                            ${event.average_rating ? '★'.repeat(Math.round(event.average_rating)) : 'No ratings'}
                        </div>
                        <div>
                            <button class="btn btn-danger btn-sm remove-favorite-btn" data-event-id="${event.id}">
                                Remove
                            </button>
                            <button class="btn btn-primary btn-sm register-btn" data-event-id="${event.id}">
                                Register
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-footer text-muted">
                    <small>${new Date(event.start_date).toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners to the remove favorite and register buttons
    document.querySelectorAll('.remove-favorite-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleFavoriteEvent(btn.dataset.eventId));
    });

    document.querySelectorAll('.register-btn').forEach(btn => {
        btn.addEventListener('click', () => registerForEvent(btn.dataset.eventId));
    });
}

/**
 * Toggle favorite status for an event
 */
async function toggleFavoriteEvent(eventId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginModal();
        return;
    }

    try {
        const isFavorite = favoriteEvents.some(event => event.id === parseInt(eventId));
        const url = `/api/favorites/${eventId}`;
        const method = isFavorite ? 'DELETE' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            if (isFavorite) {
                // Remove from favorites
                favoriteEvents = favoriteEvents.filter(event => event.id !== parseInt(eventId));
                showAlert('success', 'Event removed from favorites');
            } else {
                // Add to favorites - fetch the event details
                const eventResponse = await fetch(`/api/events/${eventId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const eventData = await eventResponse.json();
                if (eventResponse.ok && eventData.event) {
                    favoriteEvents.push(eventData.event);
                    showAlert('success', 'Event added to favorites');
                }
            }

            // Refresh the current view
            const activeTab = document.querySelector('.nav-link.active');
            if (activeTab && activeTab.id === 'favorites-tab') {
                displayFavoriteEvents(favoriteEvents);
            } else {
                // Refresh the events list to update favorite buttons
                if (typeof searchEvents === 'function') {
                    searchEvents();
                }
            }
        } else {
            const data = await response.json();
            throw new Error(data.error.message);
        }
    } catch (error) {
        console.error('Error toggling favorite event:', error);
        showAlert('danger', 'Error updating favorites. Please try again.');
    }
}

/**
 * Load and display user profile information
 */
async function loadUserProfile() {
    const token = localStorage.getItem('token');
    const userProfileInfo = document.getElementById('userProfileInfo');
    
    if (!token || !userProfileInfo) return;

    try {
        userProfileInfo.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
        
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (response.ok && data.user) {
            const user = data.user;
            userProfileInfo.innerHTML = `
                <div class="mb-3">
                    <strong>Name:</strong> ${user.name}
                </div>
                <div class="mb-3">
                    <strong>Email:</strong> ${user.email}
                </div>
                <div class="mb-3">
                    <strong>Member Since:</strong> ${new Date(user.created_at).toLocaleDateString()}
                </div>
            `;
        } else {
            throw new Error(data.error.message);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        userProfileInfo.innerHTML = `
            <div class="alert alert-danger">
                Error loading profile. Please try again.
            </div>
        `;
    }
}

/**
 * Display an alert message to the user
 */
function showAlert(type, message) {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertContainer.style.zIndex = '9999';
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertContainer);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertContainer);
        bsAlert.close();
    }, 3000);
}

/**
 * Show the login modal
 */
function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// Export functions for use in main.js
window.getUserPreferences = getUserPreferences;
window.getFavoriteEvents = getFavoriteEvents;
window.toggleFavoriteEvent = toggleFavoriteEvent;
window.loadFavoriteEvents = loadFavoriteEvents;
window.loadUserProfile = loadUserProfile;
window.initUserPreferences = initUserPreferences;
