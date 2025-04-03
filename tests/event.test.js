const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Event Management API', () => {
  let authToken;
  let testUserId;
  let testEventId;
  let testCategoryId;

  beforeAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email = $1', ['event-test@example.com']);
    
    // Create test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Event Test User',
        email: 'event-test@example.com',
        password: 'Password123!',
        preferredLanguage: 'en',
        latitude: -1.9441,
        longitude: 30.0619
      });
    
    // Check if registration was successful
    if (userRes.statusCode !== 201) {
      console.log('User registration failed:', userRes.body);
      // Try to login instead
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'event-test@example.com',
          password: 'Password123!'
        });
      
      authToken = loginRes.body.data.token;
      testUserId = loginRes.body.data.user.id;
    } else {
      authToken = userRes.body.data.token;
      testUserId = userRes.body.data.user.id;
    }
    
    // Get a category ID for testing
    const { rows } = await db.query('SELECT id FROM categories LIMIT 1');
    testCategoryId = rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM events WHERE creator_id = $1', [testUserId]);
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await db.end();
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const testEvent = {
        title: 'Test Event',
        description: 'This is a test event',
        latitude: -1.9441,
        longitude: 30.0619,
        startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endDate: new Date(Date.now() + 172800000).toISOString(),  // Day after tomorrow
        categoryId: testCategoryId,
        address: 'Test Address, Kigali',
        maxParticipants: 50
      };
      
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEvent);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toEqual('Test Event');
      
      testEventId = res.body.data.id;
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing title
          description: 'This is an invalid test event',
          latitude: -1.9441,
          longitude: 30.0619,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString()
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          title: 'Unauthorized Event',
          description: 'This should fail',
          latitude: -1.9441,
          longitude: 30.0619,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString()
        });

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/events/search', () => {
    it('should search for events by location', async () => {
      const res = await request(app)
        .get('/api/events/search')
        .query({
          latitude: -1.9441,
          longitude: 30.0619,
          radius: 10
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('should filter events by category', async () => {
      const res = await request(app)
        .get('/api/events/search')
        .query({
          categoryId: testCategoryId
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBeTruthy();
      
      // All returned events should have the specified category
      if (res.body.data.length > 0) {
        res.body.data.forEach(event => {
          expect(event.category_id).toEqual(testCategoryId);
        });
      }
    });
  });

  describe('GET /api/events/:id', () => {
    it('should get event details by ID', async () => {
      const res = await request(app)
        .get(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toEqual(testEventId);
      expect(res.body.data.title).toEqual('Test Event');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .get('/api/events/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update an existing event', async () => {
      const res = await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Test Event',
          description: 'This event has been updated'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.title).toEqual('Updated Test Event');
      expect(res.body.data.description).toEqual('This event has been updated');
    });

    it('should not allow unauthorized users to update events', async () => {
      // Create another user
      const anotherUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'another-user@example.com',
          password: 'Password123!',
          preferredLanguage: 'en'
        });
      
      const anotherToken = anotherUserRes.body.data.token;
      
      const res = await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({
          title: 'Unauthorized Update'
        });

      expect(res.statusCode).toEqual(403);
      
      // Clean up
      await db.query('DELETE FROM users WHERE email = $1', ['another-user@example.com']);
    });
  });

  describe('POST /api/events/:id/register', () => {
    it('should register a user for an event', async () => {
      const res = await request(app)
        .post(`/api/events/${testEventId}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should not allow duplicate registrations', async () => {
      const res = await request(app)
        .post(`/api/events/${testEventId}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete an event', async () => {
      const res = await request(app)
        .delete(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');
      
      // Verify event is deleted
      const checkRes = await request(app)
        .get(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(checkRes.statusCode).toEqual(404);
    });
  });
});
