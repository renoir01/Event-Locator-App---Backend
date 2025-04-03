const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const logger = require('../config/logger');

describe('User Preferences', () => {
  let authToken;
  let userId;

  const testUser = {
    email: 'preferences-test@example.com',
    password: 'password123',
    name: 'Preferences Test User',
    preferredLanguage: 'en',
    latitude: -1.9441,
    longitude: 30.0619
  };

  const testPreferences = {
    categoryIds: [1, 2],
    notificationRadius: 10
  };

  beforeAll(async () => {
    // Clean up and create test user
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    // Check if registration was successful
    if (response.statusCode !== 201) {
      console.log('User registration failed:', response.body);
      // Try to login instead
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      authToken = loginRes.body.data.token;
      userId = loginRes.body.data.user.id;
    } else {
      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    }

    // Ensure test categories exist
    await db.query(`
      INSERT INTO categories (id, name_en, name_rw)
      VALUES (1, 'Music', 'Umuziki'), (2, 'Sports', 'Siporo')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await db.pool.end();
  });

  describe('GET /api/users/preferences', () => {
    it('should get empty preferences for new user', async () => {
      const response = await request(app)
        .get('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data.categories).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('notificationRadius');
    });

    it('should not get preferences without auth', async () => {
      const response = await request(app)
        .get('/api/users/preferences');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should update user preferences', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPreferences);

      expect(response.status).toBe(200);
      expect(response.body.data.categories).toBeInstanceOf(Array);
      expect(response.body.data.categories.length).toBe(testPreferences.categoryIds.length);
      expect(response.body.data.notificationRadius).toBe(testPreferences.notificationRadius);
    });

    it('should not update preferences without auth', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .send(testPreferences);

      expect(response.status).toBe(401);
    });

    it('should validate notification radius', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testPreferences,
          notificationRadius: -5
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/events/favorites', () => {
    let eventId;

    beforeAll(async () => {
      // Create a test event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event for Favorites',
          description: 'This is a test event for testing favorites',
          location: 'Test Location',
          startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          endDate: new Date(Date.now() + 172800000).toISOString(),  // Day after tomorrow
          categoryId: 1,
          latitude: -1.9441,
          longitude: 30.0619,
          maxParticipants: 50
        });

      eventId = eventResponse.body.data.id;
    });

    it('should return empty favorites initially', async () => {
      const response = await request(app)
        .get('/api/users/events/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should add event to favorites', async () => {
      const response = await request(app)
        .post(`/api/users/events/${eventId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should list favorite events', async () => {
      const response = await request(app)
        .get('/api/users/events/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(eventId);
    });

    it('should remove event from favorites', async () => {
      const response = await request(app)
        .delete(`/api/users/events/${eventId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const checkResponse = await request(app)
        .get('/api/users/events/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.body.data.length).toBe(0);
    });
  });

  describe('GET /api/users/events/registered', () => {
    let eventId;

    beforeAll(async () => {
      // Create a test event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event for Registration',
          description: 'This is a test event for testing registration',
          location: 'Test Location',
          startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          endDate: new Date(Date.now() + 172800000).toISOString(),  // Day after tomorrow
          categoryId: 1,
          latitude: -1.9441,
          longitude: 30.0619,
          maxParticipants: 50
        });

      eventId = eventResponse.body.data.id;
    });

    it('should list empty registered events initially', async () => {
      const response = await request(app)
        .get('/api/users/events/registered')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should register for event', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should list registered events', async () => {
      const response = await request(app)
        .get('/api/users/events/registered')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(eventId);
    });
  });
});
