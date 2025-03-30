// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const showOnlyNearby = document.getElementById('showOnlyNearby');
const eventsList = document.getElementById('eventsList');

// Map Variables
let map;
let markers = [];
let currentInfoWindow = null;
let userLocation = null;
let searchRadius = 5000; // 5km in meters

// Event Listeners
loginBtn.addEventListener('click', () => loginModal.show());
registerBtn.addEventListener('click', () => registerModal.show());
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
searchBtn.addEventListener('click', searchEvents);
showOnlyNearby.addEventListener('change', handleRadiusFilter);

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
            loginModal.hide();
            updateUIForLoggedInUser(data.user);
        } else {
            alert(data.error.message);
        }
    } catch (error) {
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
                password: formData.get('password')
            })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            registerModal.hide();
            updateUIForLoggedInUser(data.user);
        } else {
            alert(data.error.message);
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
    }
}

async function searchEvents() {
    try {
        const searchQuery = searchInput.value;
        const showNearby = showOnlyNearby.checked;
        
        let url = '/api/events/search?';
        const params = new URLSearchParams();
        
        if (searchQuery) {
            params.append('q', searchQuery);
        }
        
        if (showNearby && userLocation) {
            params.append('lat', userLocation.lat);
            params.append('lng', userLocation.lng);
            params.append('radius', searchRadius);
        }
        
        const response = await fetch(url + params.toString());
        const data = await response.json();
        
        clearMarkers();
        displayEvents(data.events);
        
        // Add markers for each event
        data.events.forEach(addEventMarker);
        
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
    eventsList.innerHTML = events.map(event => `
        <div class="col-md-4">
            <div class="card event-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${event.title}</h5>
                    <p class="card-text">${event.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="rating">
                            ${event.average_rating ? '★'.repeat(Math.round(event.average_rating)) : 'No ratings'}
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="registerForEvent('${event.id}')">
                            Register
                        </button>
                    </div>
                </div>
                <div class="card-footer text-muted">
                    <small>${new Date(event.startDate).toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    `).join('');
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
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    const navbar = document.querySelector('.navbar .d-flex');
    navbar.innerHTML = `
        <span class="navbar-text me-3">Welcome, ${user.name}</span>
        <button onclick="logout()" class="btn btn-outline-light">Logout</button>
    `;
}

function logout() {
    localStorage.removeItem('token');
    window.location.reload();
}

// Map Functions
function initMap() {
    // Default center (you might want to set this to a default city)
    const defaultCenter = { lat: -1.9441, lng: 30.0619 }; // Kigali, Rwanda
    
    map = new google.maps.Map(document.getElementById('map'), {
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

    // Try to get user's location
    getCurrentPosition()
        .then(position => {
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
            searchEvents();
        });
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function addEventMarker(event) {
    const marker = new google.maps.Marker({
        position: { lat: event.latitude, lng: event.longitude },
        map: map,
        title: event.title,
        animation: google.maps.Animation.DROP
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div class="info-window">
                <h5>${event.title}</h5>
                <p>${event.description.substring(0, 100)}...</p>
                <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                <button 
                    onclick="registerForEvent('${event.id}')" 
                    class="btn btn-sm btn-primary">
                    Register
                </button>
            </div>
        `
    });

    marker.addListener('click', () => {
        if (currentInfoWindow) {
            currentInfoWindow.close();
        }
        currentInfoWindow = infoWindow;
        infoWindow.open(map, marker);
    });

    markers.push(marker);
}

function handleRadiusFilter() {
    searchEvents();
}

// Helper Functions
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
        }
        navigator.geolocation.getCurrentPosition(
            position => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }),
            error => reject(error)
        );
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    const token = localStorage.getItem('token');
    if (token) {
        fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            updateUIForLoggedInUser(data.user);
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
            localStorage.removeItem('token');
        });
    }
});
