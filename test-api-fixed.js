/**
 * Improved API Test Script for Event Locator App
 * 
 * This script tests all the main API endpoints and provides detailed output
 * on success or failure.
 */

const axios = require('axios');
const chalk = require('chalk');

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

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

// Helper function to log responses
const logResponse = (label, response) => {
  console.log(`\n${chalk.green('=====')} ${chalk.blue(label)} ${chalk.green('=====')}`);
  console.log(`${chalk.yellow('Status:')} ${response.status}`);
  
  if (response.data) {
    try {
      // Format the response data for better readability
      const formattedData = JSON.stringify(response.data, null, 2);
      console.log(`${chalk.yellow('Data:')}\n${formattedData}`);
      
      // Extract and display token if present
      if (response.data.data && response.data.data.token) {
        const token = response.data.data.token;
        console.log(`${chalk.yellow('Token:')} ${token.substring(0, 20)}...`);
      }
    } catch (e) {
      console.log(`${chalk.yellow('Data:')} [Error formatting response data]`);
      console.log(response.data);
    }
  } else {
    console.log(`${chalk.yellow('Data:')} No data returned`);
  }
};

// Helper function to log errors
const logError = (label, error) => {
  console.error(`\n${chalk.red('=====')} ${chalk.blue(label)} ${chalk.red('ERROR')} ${chalk.red('=====')}`);
  
  if (error.response) {
    console.error(`${chalk.yellow('Status:')} ${error.response.status}`);
    
    if (error.response.data) {
      try {
        // Format the error response data for better readability
        const formattedData = JSON.stringify(error.response.data, null, 2);
        console.error(`${chalk.yellow('Data:')}\n${formattedData}`);
      } catch (e) {
        console.error(`${chalk.yellow('Data:')} [Error formatting response data]`);
        console.error(error.response.data);
      }
    }
  } else {
    console.error(`${chalk.red('Error:')} ${error.message}`);
  }
};

// Helper function to track test results
const trackTest = (name, success) => {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`\n${chalk.green('✓')} Test ${chalk.blue(name)} ${chalk.green('PASSED')}`);
  } else {
    testResults.failed++;
    console.log(`\n${chalk.red('✗')} Test ${chalk.blue(name)} ${chalk.red('FAILED')}`);
  }
};

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test the API endpoints
async function testAPI() {
  console.log(chalk.blue('\n🚀 Starting API Tests for Event Locator App\n'));
  
  try {
    // 1. Register a user
    console.log(chalk.cyan('\n🔹 Test 1: User Registration'));
    let user;
    
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
      logResponse('Register User', registerResponse);
      
      if (registerResponse.data && registerResponse.data.data && registerResponse.data.data.token) {
        authToken = registerResponse.data.data.token;
        user = registerResponse.data.data.user;
        trackTest('User Registration', true);
      } else {
        console.log(chalk.yellow('⚠️ Token not found in response'));
        trackTest('User Registration', false);
        throw new Error('Token not found in response');
      }
    } catch (error) {
      logError('Register User', error);
      
      // If registration fails because user exists, try logging in
      if (error.response && error.response.status === 400) {
        console.log(chalk.cyan('\n🔹 Test 1b: User Login (fallback)'));
        try {
          const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
          });
          
          logResponse('Login User', loginResponse);
          
          if (loginResponse.data && loginResponse.data.data && loginResponse.data.data.token) {
            authToken = loginResponse.data.data.token;
            user = loginResponse.data.data.user;
            trackTest('User Login (fallback)', true);
          } else {
            console.log(chalk.yellow('⚠️ Token not found in login response'));
            trackTest('User Login (fallback)', false);
            throw new Error('Token not found in login response');
          }
        } catch (loginError) {
          logError('Login User', loginError);
          trackTest('User Login (fallback)', false);
          throw new Error('Could not authenticate');
        }
      } else {
        trackTest('User Registration', false);
        throw new Error('Could not authenticate');
      }
    }

    // Wait between requests
    await sleep(1000);

    // 2. Get user profile
    console.log(chalk.cyan('\n🔹 Test 2: Get User Profile'));
    try {
      const profileResponse = await axios.get(
        `${API_URL}/users/profile`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Get User Profile', profileResponse);
      trackTest('Get User Profile', true);
    } catch (error) {
      logError('Get User Profile', error);
      trackTest('Get User Profile', false);
    }

    await sleep(1000);

    // 3. Create an event
    console.log(chalk.cyan('\n🔹 Test 3: Create Event'));
    let createdEventId;
    try {
      const createEventResponse = await axios.post(
        `${API_URL}/events`,
        testEvent,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Create Event', createEventResponse);
      
      if (createEventResponse.data && createEventResponse.data.data && createEventResponse.data.data.id) {
        createdEventId = createEventResponse.data.data.id;
        console.log(`${chalk.yellow('Created Event ID:')} ${createdEventId}`);
        trackTest('Create Event', true);
      } else {
        console.log(chalk.yellow('⚠️ Event ID not found in response'));
        createdEventId = 1; // Use a default event ID
        trackTest('Create Event', false);
      }
    } catch (error) {
      logError('Create Event', error);
      // Use a default event ID for testing other endpoints
      createdEventId = 1; // Use a default event ID
      console.log(`${chalk.yellow('Using fallback Event ID:')} ${createdEventId}`);
      trackTest('Create Event', false);
    }

    await sleep(1000);

    // 4. Search for events
    console.log(chalk.cyan('\n🔹 Test 4: Search Events'));
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
      trackTest('Search Events', true);
    } catch (error) {
      logError('Search Events', error);
      trackTest('Search Events', false);
    }

    await sleep(1000);

    // 5. Get event details
    console.log(chalk.cyan('\n🔹 Test 5: Get Event Details'));
    try {
      const eventDetailsResponse = await axios.get(
        `${API_URL}/events/${createdEventId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Get Event Details', eventDetailsResponse);
      trackTest('Get Event Details', true);
    } catch (error) {
      logError('Get Event Details', error);
      trackTest('Get Event Details', false);
    }

    await sleep(1000);

    // 6. Register for an event
    console.log(chalk.cyan('\n🔹 Test 6: Register for Event'));
    try {
      const registerEventResponse = await axios.post(
        `${API_URL}/events/${createdEventId}/register`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logResponse('Register for Event', registerEventResponse);
      trackTest('Register for Event', true);
    } catch (error) {
      logError('Register for Event', error);
      trackTest('Register for Event', false);
    }

    // Print test summary
    console.log(chalk.cyan('\n📊 Test Summary:'));
    console.log(`${chalk.blue('Total Tests:')} ${testResults.total}`);
    console.log(`${chalk.green('Passed:')} ${testResults.passed}`);
    console.log(`${chalk.red('Failed:')} ${testResults.failed}`);
    
    if (testResults.failed === 0) {
      console.log(`\n${chalk.green('✅ All API tests passed successfully!')}`);
    } else {
      console.log(`\n${chalk.yellow('⚠️ Some tests failed. See above for details.')}`);
    }
    
  } catch (error) {
    console.error(`\n${chalk.red('❌ API Testing failed:')} ${error.message}`);
  }
}

// Run the test
testAPI();
