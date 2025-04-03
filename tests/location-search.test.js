const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Location-Based Search API', () => {
  let testUser;
  let testEvent;
  let authToken;
  let categoryId;
  
  // Test coordinates in Kigali, Rwanda
  const testCoordinates = {
    userLat: -1.9441,
    userLng: 30.0619,
    eventLat: -1.9500,
    eventLng: 30.0700 // Approximately 1.2 km away from user
  };

  beforeAll(async () => {
    // Get a valid category ID
    const categoryResult = await db.query('SELECT id FROM categories LIMIT 1');
    categoryId = categoryResult.rows[0]?.id || 1;
    
    // Create test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Search Test User',
        email: 'search-test@example.com',
        password: 'Password123!',
        preferredLanguage: 'en',
        latitude: testCoordinates.userLat,
        longitude: testCoordinates.userLng
      });
    
    testUser = userRes.body.data.user;
    authToken = userRes.body.data.token;
    
    // Create test event directly in the database to ensure proper geography type
    const eventResult = await db.query(
      `INSERT INTO events 
        (creator_id, title, description, location, address, start_date, end_date, category_id, max_participants) 
       VALUES 
        ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        testUser.id,
        'Location Search Test Event',
        'Test event for location-based search',
        testCoordinates.eventLng, // Note: PostGIS uses longitude first, latitude second
        testCoordinates.eventLat,
        'Kigali Convention Center, Rwanda',
        new Date(Date.now() + 86400000), // Tomorrow
        new Date(Date.now() + 172800000), // Day after tomorrow
        categoryId,
        50
      ]
    );
    
    testEvent = eventResult.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    if (testEvent?.id) {
      await db.query('DELETE FROM events WHERE id = $1', [testEvent.id]);
    }
    if (testUser?.id) {
      await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
  });

  describe('GET /api/events/search', () => {
    it('should find events within a specified radius', async () => {
      const res = await request(app)
        .get('/api/events/search')
        .query({
          latitude: testCoordinates.userLat,
          longitude: testCoordinates.userLng,
          radius: 5 // 5 km radius should include our test event
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeDefined();
      
      // Find our test event in the results
      const foundEvent = res.body.data.events.find(event => event.id === testEvent.id);
      expect(foundEvent).toBeDefined();
    });

    it('should not find events outside the specified radius', async () => {
      const res = await request(app)
        .get('/api/events/search')
        .query({
          latitude: testCoordinates.userLat,
          longitude: testCoordinates.userLng,
          radius: 0.5 // 0.5 km radius should NOT include our test event (which is ~1.2km away)
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Our test event should not be in the results
      const foundEvent = res.body.data.events.find(event => event.id === testEvent.id);
      expect(foundEvent).toBeUndefined();
    });

    it('should filter events by category', async () => {
      const res = await request(app)
        .get('/api/events/search')
        .query({
          latitude: testCoordinates.userLat,
          longitude: testCoordinates.userLng,
          radius: 5,
          categoryId
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Our test event should be in the results since it matches the category
      const foundEvent = res.body.data.events.find(event => event.id === testEvent.id);
      expect(foundEvent).toBeDefined();
    });

    it('should validate required parameters', async () => {
      const res = await request(app)
        .get('/api/events/search')
        .query({
          // Missing latitude and longitude
          radius: 5
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });
  });
});
