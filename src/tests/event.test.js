const request = require('supertest');
const app = require('../app');
const db = require('../config/database');

describe('Event Management', () => {
  let authToken;
  let userId;
  let eventId;

  const testUser = {
    email: 'event-test@example.com',
    password: 'password123',
    name: 'Event Test User'
  };

  const testEvent = {
    title: 'Test Event',
    description: 'A test event description',
    latitude: -1.9441,
    longitude: 30.0619,
    startDate: '2025-04-01T10:00:00Z',
    endDate: '2025-04-01T12:00:00Z',
    categoryId: 1,
    address: 'Test Address',
    maxParticipants: 50
  };

  beforeAll(async () => {
    // Clean up and create test user
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = response.body.data.token;
    userId = response.body.data.user.id;

    // Ensure test category exists
    await db.query(`
      INSERT INTO categories (name_en, name_rw)
      VALUES ('Test Category', 'Icyiciro cy''Igerageza')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM events WHERE creator_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await db.pool.end();
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEvent);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(testEvent.title);
      eventId = response.body.data.id;
    });

    it('should not create event without auth', async () => {
      const response = await request(app)
        .post('/api/events')
        .send(testEvent);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/events/search', () => {
    it('should find events within radius', async () => {
      const response = await request(app)
        .get('/api/events/search')
        .query({
          latitude: testEvent.latitude,
          longitude: testEvent.longitude,
          radius: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('distance_km');
    });
  });

  describe('GET /api/events/:id', () => {
    it('should get event by id', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(eventId);
      expect(response.body.data.title).toBe(testEvent.title);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update event', async () => {
      const updates = {
        title: 'Updated Test Event',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.description).toBe(updates.description);
    });

    it('should not update event without auth', async () => {
      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .send({ title: 'Unauthorized Update' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/events/:id/register', () => {
    it('should register for event', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('registered');
    });

    it('should not register twice', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/events/:id/register', () => {
    it('should unregister from event', async () => {
      const response = await request(app)
        .delete(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete event', async () => {
      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 for deleted event', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}`);

      expect(response.status).toBe(404);
    });
  });
});
