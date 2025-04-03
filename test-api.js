const axios = require('axios');
const chalk = require('chalk') || { green: (text) => text, red: (text) => text, yellow: (text) => text, blue: (text) => text };

// Base URL for the API
const API_URL = 'http://localhost:3000/api';

// Test user credentials
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123!',
  preferredLanguage: 'en',
  latitude: -1.9441,
  longitude: 30.0619
};

// Test event data
const testEvent = {
  title: 'Test Event',
  description: 'This is a test event for API testing',
  latitude: -1.9441,
  longitude: 30.0619,
  address: 'Kigali Convention Center',
  startDate: '2025-05-20T09:00:00Z',
  endDate: '2025-05-20T18:00:00Z',
  categoryId: 1,
  maxParticipants: 50
};

// Store auth token
let authToken = '';

// Helper function to log responses
const logResponse = (label, response) => {
  console.log(`\n${chalk.green('=====')} ${chalk.blue(label)} ${chalk.green('=====')}`);
  console.log(`${chalk.yellow('Status:')} ${response.status}`);
  try {
    // Format the response data for better readability
    const formattedData = JSON.stringify(response.data, null, 2);
    console.log(`${chalk.yellow('Data:')}\n${formattedData}`);
  } catch (e) {
    console.log(`${chalk.yellow('Data:')} [Error stringifying response data]`);
    console.log(response.data);
  }
};

// Helper function to log errors
const logError = (label, error) => {
  console.error(`\n${chalk.red('=====')} ${chalk.blue(label)} ${chalk.red('ERROR')} ${chalk.red('=====')}`);
  if (error.response) {
    console.error(`${chalk.yellow('Status:')} ${error.response.status}`);
    try {
      // Format the error response data for better readability
      const formattedData = JSON.stringify(error.response.data, null, 2);
      console.error(`${chalk.yellow('Data:')}\n${formattedData}`);
    } catch (e) {
      console.error(`${chalk.yellow('Data:')} [Error stringifying response data]`);
      console.error(error.response.data);
    }
  } else {
    console.error(`${chalk.red('Error:')} ${error.message}`);
  }
};

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test the API endpoints
async function testAPI() {
  try {
    console.log('\n🔹 Testing user registration...');
    let user;
    
    // 1. Register a user
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
      logResponse('Register User', registerResponse);
      authToken = registerResponse.data.data.token;
      user = registerResponse.data.data.user;
      console.log(`${chalk.yellow('Auth Token:')} ${authToken.substring(0, 15)}...`);
    } catch (error) {
      logError('Register User', error);
      
      // Try logging in instead if registration fails
      console.log('\n🔹 Trying to login instead...');
      try {
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        });
        logResponse('Login User', loginResponse);
        authToken = loginResponse.data.data.token;
        user = loginResponse.data.data.user;
        console.log(`${chalk.yellow('Auth Token:')} ${authToken.substring(0, 15)}...`);
      } catch (loginError) {
        logError('Login User', loginError);
        throw new Error('Could not authenticate');
      }
    }

    // Wait a bit between requests
    await sleep(1000);

    // 2. Get user profile
    console.log('\n🔹 Testing get user profile...');
    try {
      const profileResponse = await axios.get(
        `${API_URL}/users/profile`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Get User Profile', profileResponse);
    } catch (error) {
      logError('Get User Profile', error);
    }

    await sleep(1000);

    // 3. Create an event
    console.log('\n🔹 Testing event creation...');
    let createdEventId;
    try {
      const createEventResponse = await axios.post(
        `${API_URL}/events`,
        testEvent,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Create Event', createEventResponse);
      createdEventId = createEventResponse.data.data.id;
      console.log(`${chalk.yellow('Created Event ID:')} ${createdEventId}`);
    } catch (error) {
      logError('Create Event', error);
      // Use a default event ID for testing other endpoints
      createdEventId = 7; // Use the last known event ID from previous test runs
      console.log(`${chalk.yellow('Using fallback Event ID:')} ${createdEventId}`);
    }

    await sleep(1000);

    // 4. Search for events
    console.log('\n🔹 Testing event search...');
    try {
      const searchParams = new URLSearchParams({
        latitude: testUser.latitude,
        longitude: testUser.longitude,
        radius: 10,
        limit: 10,
        offset: 0
      }).toString();
      
      const searchResponse = await axios.get(
        `${API_URL}/events/search?${searchParams}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Search Events', searchResponse);
    } catch (error) {
      logError('Search Events', error);
    }

    await sleep(1000);

    // 5. Get event details
    console.log('\n🔹 Testing get event details...');
    try {
      const eventDetailsResponse = await axios.get(
        `${API_URL}/events/${createdEventId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Get Event Details', eventDetailsResponse);
    } catch (error) {
      logError('Get Event Details', error);
    }

    await sleep(1000);

    // 6. Register for an event
    console.log('\n🔹 Testing event registration...');
    try {
      const registerEventResponse = await axios.post(
        `${API_URL}/events/${createdEventId}/register`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Register for Event', registerEventResponse);
    } catch (error) {
      logError('Register for Event', error);
    }

    console.log('\n✅ API Testing completed!');
  } catch (error) {
    console.error('\n❌ API Testing failed:', error.message);
  }
}

// Run the test
testAPI();
