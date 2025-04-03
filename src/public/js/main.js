// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const createEventModal = new bootstrap.Modal(document.getElementById('createEventModal'));
const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const createEventForm = document.getElementById('createEventForm');
const preferencesForm = document.getElementById('preferencesForm');
const profileForm = document.getElementById('profileForm');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const showOnlyNearby = document.getElementById('showOnlyNearby');
const eventsList = document.getElementById('eventsList');
const favoritesList = document.getElementById('favoritesList');
const registeredEventsList = document.getElementById('registeredEventsList');
const userProfileInfo = document.getElementById('userProfileInfo');
const categoriesContainer = document.getElementById('categoriesContainer');
const eventCategory = document.getElementById('eventCategory');
const notificationRadius = document.getElementById('notificationRadius');
const radiusValue = document.getElementById('radiusValue');
const languageSelector = document.getElementById('languageSelector');
const logoutBtn = document.getElementById('logoutBtn');
const createEventBtn = document.getElementById('createEventBtn');
const userNavMenu = document.getElementById('userNavMenu');
const userDisplayName = document.getElementById('userDisplayName');
const profileLink = document.getElementById('profileLink');
const favoritesLink = document.getElementById('favoritesLink');
const notificationsLink = document.getElementById('notificationsLink');
const notificationCount = document.getElementById('notificationCount');
const notificationsList = document.getElementById('notificationsList');
const profileTabs = document.getElementById('profileTabs');
const getCurrentLocationBtn = document.getElementById('getCurrentLocationBtn');
const registerLocationBtn = document.getElementById('registerLocationBtn');
const eventLocationBtn = document.getElementById('eventLocationBtn');
const profileName = document.getElementById('profileName');
const profileLanguage = document.getElementById('profileLanguage');
const profileLatitude = document.getElementById('profileLatitude');
const profileLongitude = document.getElementById('profileLongitude');
const registerLatitude = document.getElementById('registerLatitude');
const registerLongitude = document.getElementById('registerLongitude');
const eventLatitude = document.getElementById('eventLatitude');
const eventLongitude = document.getElementById('eventLongitude');

// Map Variables
let map;
let markers = [];
let currentInfoWindow = null;
let userLocation = null;
let searchRadius = 5000; // 5km in meters
let userPreferences = null;
let favoriteEvents = [];
let categories = [];

// Event Listeners
if (loginBtn) loginBtn.addEventListener('click', () => loginModal.show());
if (registerBtn) registerBtn.addEventListener('click', () => registerModal.show());
if (loginForm) loginForm.addEventListener('submit', handleLogin);
if (registerForm) registerForm.addEventListener('submit', handleRegister);
if (profileForm) profileForm.addEventListener('submit', updateProfile);
if (searchBtn) searchBtn.addEventListener('click', searchEvents);
if (showOnlyNearby) showOnlyNearby.addEventListener('change', handleRadiusFilter);
if (languageSelector) languageSelector.addEventListener('change', changeLanguage);
if (logoutBtn) logoutBtn.addEventListener('click', logout);
if (createEventBtn) createEventBtn.addEventListener('click', () => createEventModal.show());
if (createEventForm) createEventForm.addEventListener('submit', createEvent);
if (preferencesForm) preferencesForm.addEventListener('submit', handlePreferencesUpdate);
if (notificationRadius) notificationRadius.addEventListener('input', updateRadiusDisplay);
if (profileLink) profileLink.addEventListener('click', () => showTab('profile-tab'));
if (favoritesLink) favoritesLink.addEventListener('click', () => showTab('favorites-tab'));
if (notificationsLink) notificationsLink.addEventListener('click', () => notificationModal.show());
if (getCurrentLocationBtn) getCurrentLocationBtn.addEventListener('click', () => setCurrentLocation('profile'));
if (registerLocationBtn) registerLocationBtn.addEventListener('click', () => setCurrentLocation('register'));
if (eventLocationBtn) eventLocationBtn.addEventListener('click', () => setCurrentLocation('event'));

// API Functions
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(loginForm);
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            loginModal.hide();
            updateUIForLoggedInUser(data.data.user);
            alert('Login successful!');
            window.location.reload();
        } else {
            alert(data.error ? data.error.message : 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(registerForm);
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                preferredLanguage: formData.get('preferredLanguage') || 'en',
                latitude: parseFloat(formData.get('latitude')) || null,
                longitude: parseFloat(formData.get('longitude')) || null
            })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            registerModal.hide();
            updateUIForLoggedInUser(data.data.user);
            alert('Registration successful!');
            window.location.reload();
        } else {
            alert(data.error ? data.error.message : 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function searchEvents() {
    try {
        console.log('Searching events...');
        const searchQuery = searchInput ? searchInput.value : '';
        const showNearby = showOnlyNearby ? showOnlyNearby.checked : false;
        
        let url = '/api/events/search?';
        const params = new URLSearchParams();
        
        if (searchQuery) {
            params.append('q', searchQuery);
        }
        
        if (showNearby && userLocation) {
            params.append('latitude', userLocation.lat);
            params.append('longitude', userLocation.lng);
            params.append('radius', searchRadius / 1000); // Convert to km
        }
        
        // Add pagination and limit
        params.append('limit', 20);
        params.append('offset', 0);
        
        // Add category filter if selected
        const categoryId = eventCategory ? eventCategory.value : null;
        if (categoryId && categoryId !== 'all') {
            params.append('categoryId', categoryId);
        }
        
        console.log('Search URL:', url + params.toString());
        
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch(url + params.toString(), {
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Search results:', data);
        
        // Clear existing markers
        clearMarkers();
        
        // Check if we have events data
        const events = data.data || [];
        console.log('Events to display:', events);
        
        // Display events in the list
        displayEvents(events);
        
        // Add markers for each event
        events.forEach(addEventMarker);
        
        // Fit bounds to show all markers if we have any
        if (markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            if (userLocation) {
                bounds.extend(userLocation);
            }
            map.fitBounds(bounds);
        }
    } catch (error) {
        console.error('Error searching events:', error);
        alert('Error searching events. Please try again.');
    }
}

function displayEvents(events) {
    if (!eventsList) {
        console.error('Events list element not found');
        return;
    }
    
    eventsList.innerHTML = '';
    
    if (!events || events.length === 0) {
        eventsList.innerHTML = '<div class="col-12 text-center"><p>No events found. Try adjusting your search criteria.</p></div>';
        return;
    }
    
    // Get the user's favorite events
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    events.forEach(event => {
        const isFavorite = favoriteEvents.some(fav => fav.id === event.id);
        const eventDate = new Date(event.start_date);
        const formattedDate = eventDate.toLocaleDateString(undefined, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card event-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${event.title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${event.category_name_en}</h6>
                    <p class="card-text">${event.description}</p>
                    <p class="card-text"><small class="text-muted"><i class="bi bi-calendar"></i> ${formattedDate}</small></p>
                    <p class="card-text"><small class="text-muted"><i class="bi bi-geo-alt"></i> ${event.address || 'No address provided'}</small></p>
                    ${token ? `
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <button class="btn btn-sm btn-outline-primary register-btn" data-event-id="${event.id}">Register</button>
                        <button class="btn btn-sm ${isFavorite ? 'btn-danger' : 'btn-outline-danger'} favorite-btn" data-event-id="${event.id}">
                            <i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>
                        </button>
                    </div>` : ''}
                </div>
            </div>
        `;
        
        eventsList.appendChild(card);
        
        // Add event listeners for the buttons
        if (token) {
            const registerBtn = card.querySelector('.register-btn');
            if (registerBtn) {
                registerBtn.addEventListener('click', () => registerForEvent(event.id));
            }
            
            const favoriteBtn = card.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.addEventListener('click', () => toggleFavoriteEvent(event.id));
            }
        }
    });
}

async function registerForEvent(eventId) {
    const token = localStorage.getItem('token');
    if (!token) {
        loginModal.show();
        return;
    }

    try {
        const response = await fetch(`/api/events/${eventId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            alert('Successfully registered for the event!');
        } else {
            alert(data.error.message);
        }
    } catch (error) {
        alert('An error occurred while registering for the event.');
    }
}

function updateUIForLoggedInUser(user) {
    if (loginBtn) loginBtn.classList.add('d-none');
    if (registerBtn) registerBtn.classList.add('d-none');
    if (userNavMenu) {
        userNavMenu.classList.remove('d-none');
        if (userDisplayName) userDisplayName.textContent = user.name;
    }
    
    if (createEventBtn) createEventBtn.classList.remove('d-none');
    
    // Update user profile info
    updateUserProfileInfo(user);
    
    // Get user preferences
    getUserPreferences();
    
    // Get favorite events
    getFavoriteEvents();
    
    // Get registered events
    getRegisteredEvents();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// Profile Functions
async function updateProfile(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to update your profile');
        return;
    }
    
    try {
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: profileName.value,
                preferredLanguage: profileLanguage.value,
                latitude: parseFloat(profileLatitude.value) || null,
                longitude: parseFloat(profileLongitude.value) || null
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            // Update local storage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...user, ...data.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Update UI
            updateUserProfileInfo(updatedUser);
            if (userDisplayName) userDisplayName.textContent = updatedUser.name;
            
            alert('Profile updated successfully');
        } else {
            alert(data.error ? data.error.message : 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('An error occurred. Please try again.');
    }
}

function updateUserProfileInfo(user) {
    if (!userProfileInfo) return;
    
    if (profileName) profileName.value = user.name || '';
    if (profileLanguage) profileLanguage.value = user.preferred_language || 'en';
    if (profileLatitude) profileLatitude.value = user.latitude || '';
    if (profileLongitude) profileLongitude.value = user.longitude || '';
    
    userProfileInfo.innerHTML = `
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Preferred Language:</strong> ${user.preferred_language === 'rw' ? 'Kinyarwanda' : 'English'}</p>
        <p><strong>Location:</strong> ${user.latitude ? `${user.latitude}, ${user.longitude}` : 'Not set'}</p>
        <p><strong>Member Since:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
    `;
}

// Map Functions
function initMap() {
    try {
        console.log('Initializing map...');
        // Default center (Kigali, Rwanda)
        const defaultCenter = { lat: -1.9441, lng: 30.0619 };
        
        // Check if map element exists
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }
        
        // Create the map
        map = new google.maps.Map(mapElement, {
            zoom: 13,
            center: defaultCenter,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        console.log('Map created successfully');

        // Try to get user's location
        getCurrentPosition()
            .then(position => {
                console.log('Got user position:', position.coords);
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(userLocation);
                
                // Add user marker
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    },
                    title: "Your Location"
                });
                
                // Initial search with user's location
                searchEvents();
            })
            .catch(error => {
                console.error('Error getting location:', error);
                // Still try to search events with default location
                searchEvents();
            });
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function addEventMarker(event) {
    try {
        // Check if event has valid coordinates
        if (!event.latitude || !event.longitude) {
            console.error('Event missing coordinates:', event);
            return;
        }
        
        const eventPosition = { 
            lat: parseFloat(event.latitude), 
            lng: parseFloat(event.longitude) 
        };
        
        const marker = new google.maps.Marker({
            position: eventPosition,
            map: map,
            title: event.title,
            animation: google.maps.Animation.DROP
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="info-window">
                    <h5>${event.title}</h5>
                    <p>${event.description ? event.description.substring(0, 100) + '...' : 'No description'}</p>
                    <p><strong>Date:</strong> ${new Date(event.start_date).toLocaleDateString()}</p>
                    <p><strong>Address:</strong> ${event.address || 'No address provided'}</p>
                    <button class="btn btn-sm btn-primary view-event-btn" data-event-id="${event.id}">View Details</button>
                </div>
            `
        });

        marker.addListener('click', () => {
            if (currentInfoWindow) {
                currentInfoWindow.close();
            }
            infoWindow.open(map, marker);
            currentInfoWindow = infoWindow;
        });

        markers.push(marker);
        
        // Add event listener to the "View Details" button in the info window
        google.maps.event.addListener(infoWindow, 'domready', () => {
            document.querySelector('.view-event-btn').addEventListener('click', () => {
                // Implement view event details functionality
                console.log('View event:', event.id);
            });
        });
    } catch (error) {
        console.error('Error adding event marker:', error, event);
    }
}

function handleRadiusFilter() {
    searchRadius = showOnlyNearby.checked ? 5000 : 50000; // 5km or 50km
    searchEvents();
}

// User Preferences Functions
async function getUserPreferences() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/users/preferences', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        userPreferences = data.data;
        
        // Update UI with user preferences
        if (notificationRadius) {
            notificationRadius.value = userPreferences.notificationRadius;
            updateRadiusDisplay();
        }
        
        // Load categories and update checkboxes
        await loadCategories();
        updateCategoryCheckboxes();
        
        return userPreferences;
    } catch (error) {
        console.error('Error getting user preferences:', error);
        return null;
    }
}

async function handlePreferencesUpdate(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to update preferences');
        return;
    }
    
    // Get all checked category checkboxes
    const checkedCategories = document.querySelectorAll('input[name="category"]:checked');
    if (checkedCategories.length === 0) {
        alert('Please select at least one category');
        return;
    }
    
    const categoryIds = Array.from(checkedCategories).map(checkbox => parseInt(checkbox.value));
    const radius = parseFloat(notificationRadius.value);
    
    try {
        const response = await fetch('/api/users/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                categoryIds,
                notificationRadius: radius
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            userPreferences = data.data;
            alert('Preferences updated successfully');
        } else {
            alert(data.error ? data.error.message : 'Failed to update preferences');
        }
    } catch (error) {
        console.error('Error updating preferences:', error);
        alert('An error occurred. Please try again.');
    }
}

function updateRadiusDisplay() {
    if (radiusValue && notificationRadius) {
        radiusValue.textContent = `${notificationRadius.value}km`;
    }
}

async function loadCategories() {
    if (categories.length > 0) return categories;
    
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        categories = data.data || [];
        
        // Update category dropdowns
        updateCategoryDropdowns();
        
        return categories;
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

function updateCategoryDropdowns() {
    // Update event creation dropdown
    if (eventCategory) {
        eventCategory.innerHTML = '<option value="">Select a category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name_en;
            eventCategory.appendChild(option);
        });
    }
}

function updateCategoryCheckboxes() {
    if (!categoriesContainer || !userPreferences) return;
    
    categoriesContainer.innerHTML = '';
    
    categories.forEach(category => {
        const isChecked = userPreferences.categories.some(c => c.id === category.id);
        
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check category-checkbox';
        checkboxDiv.innerHTML = `
            <input class="form-check-input" type="checkbox" name="category" value="${category.id}" id="category-${category.id}" ${isChecked ? 'checked' : ''}>
            <label class="form-check-label" for="category-${category.id}">
                ${category.name_en}
            </label>
        `;
        
        categoriesContainer.appendChild(checkboxDiv);
    });
}

// Favorite Events Functions
async function getFavoriteEvents() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/users/events/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        favoriteEvents = data.data || [];
        
        // Update favorites tab if it exists
        updateFavoritesTab();
        
        return favoriteEvents;
    } catch (error) {
        console.error('Error getting favorite events:', error);
        return [];
    }
}

function updateFavoritesTab() {
    if (!favoritesList) return;
    
    favoritesList.innerHTML = '';
    
    if (favoriteEvents.length === 0) {
        favoritesList.innerHTML = '<div class="col-12 text-center"><p>You have no favorite events yet.</p></div>';
        return;
    }
    
    favoriteEvents.forEach(event => {
        const eventDate = new Date(event.start_date);
        const formattedDate = eventDate.toLocaleDateString(undefined, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card event-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${event.title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${event.category_name_en}</h6>
                    <p class="card-text">${event.description}</p>
                    <p class="card-text"><small class="text-muted"><i class="bi bi-calendar"></i> ${formattedDate}</small></p>
                    <p class="card-text"><small class="text-muted"><i class="bi bi-geo-alt"></i> ${event.address || 'No address provided'}</small></p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <button class="btn btn-sm btn-outline-primary register-btn" data-event-id="${event.id}">Register</button>
                        <button class="btn btn-sm btn-danger remove-favorite-btn" data-event-id="${event.id}">
                            <i class="bi bi-heart-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        favoritesList.appendChild(card);
        
        // Add event listeners
        const registerBtn = card.querySelector('.register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => registerForEvent(event.id));
        }
        
        const removeFavoriteBtn = card.querySelector('.remove-favorite-btn');
        if (removeFavoriteBtn) {
            removeFavoriteBtn.addEventListener('click', () => toggleFavoriteEvent(event.id));
        }
    });
}

async function toggleFavoriteEvent(eventId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to favorite events');
        return;
    }
    
    try {
        const isFavorite = favoriteEvents.some(event => event.id === eventId);
        let response;
        
        if (isFavorite) {
            // Remove from favorites
            response = await fetch(`/api/users/events/${eventId}/favorite`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            // Add to favorites
            response = await fetch(`/api/users/events/${eventId}/favorite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Refresh favorites
        await getFavoriteEvents();
        
        // Refresh current events display to update favorite icons
        searchEvents();
        
    } catch (error) {
        console.error('Error toggling favorite event:', error);
        alert('An error occurred. Please try again.');
    }
}

// Registered Events Functions
async function getRegisteredEvents() {
    const token = localStorage.getItem('token');
    if (!token || !registeredEventsList) return;
    
    try {
        const response = await fetch('/api/users/events/registered', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const events = data.data || [];
        
        registeredEventsList.innerHTML = '';
        
        if (events.length === 0) {
            registeredEventsList.innerHTML = '<div class="col-12 text-center"><p>You have not registered for any events yet.</p></div>';
            return;
        }
        
        events.forEach(event => {
            const eventDate = new Date(event.start_date);
            const formattedDate = eventDate.toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4';
            card.innerHTML = `
                <div class="card event-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${event.title}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${event.category_name_en}</h6>
                        <p class="card-text">${event.description}</p>
                        <p class="card-text"><small class="text-muted"><i class="bi bi-calendar"></i> ${formattedDate}</small></p>
                        <p class="card-text"><small class="text-muted"><i class="bi bi-geo-alt"></i> ${event.address || 'No address provided'}</small></p>
                        <p class="card-text"><small class="text-muted"><i class="bi bi-check-circle"></i> Registered on ${new Date(event.registration_date).toLocaleDateString()}</small></p>
                    </div>
                </div>
            `;
            
            registeredEventsList.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error getting registered events:', error);
        registeredEventsList.innerHTML = '<div class="col-12 text-center"><p>Error loading registered events. Please try again.</p></div>';
    }
}

// Helper Functions
function showTab(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        const tabInstance = new bootstrap.Tab(tab);
        tabInstance.show();
    }
}

async function setCurrentLocation(target) {
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        
        switch (target) {
            case 'profile':
                if (profileLatitude) profileLatitude.value = latitude;
                if (profileLongitude) profileLongitude.value = longitude;
                break;
            case 'register':
                if (registerLatitude) registerLatitude.value = latitude;
                if (registerLongitude) registerLongitude.value = longitude;
                break;
            case 'event':
                if (eventLatitude) eventLatitude.value = latitude;
                if (eventLongitude) eventLongitude.value = longitude;
                break;
        }
    } catch (error) {
        console.error('Error getting current position:', error);
        alert('Unable to get your current location. Please check your browser permissions.');
    }
}

// Internationalization Functions
function changeLanguage(e) {
    const lang = e.target.value;
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    window.location.reload();
}

function getLanguageFromCookie() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'NEXT_LOCALE') {
            return value;
        }
    }
    return 'en'; // Default language
}

// Create Event Function
async function createEvent(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to create an event');
        return;
    }
    
    const formData = new FormData(createEventForm);
    
    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: formData.get('title'),
                description: formData.get('description'),
                address: formData.get('address'),
                categoryId: parseInt(formData.get('category')),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                latitude: parseFloat(formData.get('latitude')) || null,
                longitude: parseFloat(formData.get('longitude')) || null,
                maxParticipants: parseInt(formData.get('maxParticipants')) || null
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            createEventModal.hide();
            createEventForm.reset();
            alert('Event created successfully!');
            searchEvents(); // Refresh events list
        } else {
            alert(data.error ? data.error.message : 'Failed to create event');
        }
    } catch (error) {
        console.error('Error creating event:', error);
        alert('An error occurred. Please try again.');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the map
        initMap();
        
        // Set language selector based on cookie
        if (languageSelector) {
            const lang = getLanguageFromCookie();
            languageSelector.value = lang;
        }
        
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        
        if (token && user) {
            // Update UI for logged in user
            updateUIForLoggedInUser(user);
            
            // Load user data
            await Promise.all([
                getUserPreferences(),
                getFavoriteEvents(),
                getRegisteredEvents()
            ]);
        } else {
            // Update UI for guest user
            if (loginBtn) loginBtn.classList.remove('d-none');
            if (registerBtn) registerBtn.classList.remove('d-none');
            if (userNavMenu) userNavMenu.classList.add('d-none');
            if (createEventBtn) createEventBtn.classList.add('d-none');
        }
        
        // Load categories for the dropdown
        await loadCategories();
        
        // Set up radius slider display
        if (notificationRadius) {
            updateRadiusDisplay();
        }
        
        // Initial search for events
        searchEvents();
        
        // Set up notification checking
        if (token) {
            checkNotifications();
            // Check for new notifications every minute
            setInterval(checkNotifications, 60000);
        }
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Notification Functions
async function checkNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/users/notifications', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const notifications = data.data || [];
        
        // Update notification count
        if (notificationCount) {
            const unreadCount = notifications.filter(n => !n.read).length;
            notificationCount.textContent = unreadCount;
            notificationCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
        
        // Update notifications list
        if (notificationsList) {
            notificationsList.innerHTML = '';
            
            if (notifications.length === 0) {
                notificationsList.innerHTML = '<div class="text-center p-3">No notifications</div>';
                return;
            }
            
            notifications.forEach(notification => {
                const item = document.createElement('div');
                item.className = `notification-item p-3 border-bottom ${notification.read ? '' : 'unread'}`;
                item.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <h6 class="mb-1">${notification.title}</h6>
                        <small>${new Date(notification.created_at).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1">${notification.message}</p>
                    ${!notification.read ? `<button class="btn btn-sm btn-outline-primary mark-read-btn" data-id="${notification.id}">Mark as read</button>` : ''}
                `;
                
                notificationsList.appendChild(item);
                
                // Add event listener for mark as read button
                const markReadBtn = item.querySelector('.mark-read-btn');
                if (markReadBtn) {
                    markReadBtn.addEventListener('click', () => markNotificationAsRead(notification.id));
                }
            });
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

async function markNotificationAsRead(notificationId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`/api/users/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Refresh notifications
        checkNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}
