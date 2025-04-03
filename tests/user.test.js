const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('User Management API', () => {
  let authToken;
  let testUserId;
  let testCategoryIds = [];
  let testEventId;

  beforeAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email = $1', ['user-test@example.com']);
    
    // Create test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Test User',
        email: 'user-test@example.com',
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
          email: 'user-test@example.com',
          password: 'Password123!'
        });
      
      authToken = loginRes.body.data.token;
      testUserId = loginRes.body.data.user.id;
    } else {
      authToken = userRes.body.data.token;
      testUserId = userRes.body.data.user.id;
    }
    
    // Get category IDs for testing
    const { rows } = await db.query('SELECT id FROM categories LIMIT 3');
    testCategoryIds = rows.map(row => row.id);
    
    // Create a test event
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'User Test Event',
        description: 'This is a test event for user tests',
        latitude: -1.9441,
        longitude: 30.0619,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        categoryId: testCategoryIds[0],
        address: 'Test Address, Kigali',
        maxParticipants: 50
      });
    
    testEventId = eventRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM events WHERE creator_id = $1', [testUserId]);
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await db.end();
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toEqual(testUserId);
      expect(res.body.data.email).toEqual('user-test@example.com');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/users/profile');

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated User Name',
          preferredLanguage: 'rw'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toEqual('Updated User Name');
      expect(res.body.data.preferred_language).toEqual('rw');
    });

    it('should update user location', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: -1.9500,
          longitude: 30.0700
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.latitude).toEqual(-1.95);
      expect(res.body.data.longitude).toEqual(30.07);
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should update user preferences', async () => {
      const res = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryIds: testCategoryIds,
          notificationRadius: 10.5
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('notificationRadius');
      expect(res.body.data.notificationRadius).toEqual(10.5);
      expect(Array.isArray(res.body.data.categories)).toBeTruthy();
      expect(res.body.data.categories.length).toEqual(testCategoryIds.length);
    });

    it('should validate notification radius', async () => {
      const res = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryIds: testCategoryIds,
          notificationRadius: -5 // Invalid negative radius
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should require at least one category', async () => {
      const res = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryIds: [], // Empty array
          notificationRadius: 10
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/preferences', () => {
    it('should get user preferences', async () => {
      const res = await request(app)
        .get('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('notificationRadius');
      expect(Array.isArray(res.body.data.categories)).toBeTruthy();
    });
  });

  describe('POST /api/users/events/:eventId/favorite', () => {
    it('should add an event to favorites', async () => {
      const res = await request(app)
        .post(`/api/users/events/${testEventId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
    });

    it('should not allow adding non-existent events to favorites', async () => {
      const res = await request(app)
        .post('/api/users/events/99999/favorite')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/users/events/favorites', () => {
    it('should get user favorite events', async () => {
      const res = await request(app)
        .get('/api/users/events/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBeTruthy();
      
      if (res.body.data.length > 0) {
        expect(res.body.data[0].id).toEqual(testEventId);
      }
    });
  });

  describe('DELETE /api/users/events/:eventId/favorite', () => {
    it('should remove an event from favorites', async () => {
      const res = await request(app)
        .delete(`/api/users/events/${testEventId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');
      
      // Verify event is removed from favorites
      const checkRes = await request(app)
        .get('/api/users/events/favorites')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(checkRes.statusCode).toEqual(200);
      expect(checkRes.body.data.find(e => e.id === testEventId)).toBeUndefined();
    });

    it('should return 404 for non-favorited events', async () => {
      const res = await request(app)
        .delete(`/api/users/events/${testEventId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/users/events/registered', () => {
    it('should get user registered events', async () => {
      // First register for the event
      await request(app)
        .post(`/api/events/${testEventId}/register`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .get('/api/users/events/registered')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBeTruthy();
      
      if (res.body.data.length > 0) {
        expect(res.body.data.some(e => e.id === testEventId)).toBeTruthy();
      }
    });
  });
});
