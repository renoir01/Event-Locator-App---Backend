const request = require('supertest');
const app = require('../app');
const db = require('../config/database');

describe('Rating System', () => {
  let authToken;
  let userId;
  let eventId;

  const testUser = {
    email: 'rating-test@example.com',
    password: 'password123',
    name: 'Rating Test User'
  };

  const testEvent = {
    title: 'Test Event for Rating',
    description: 'A test event description',
    latitude: -1.9441,
    longitude: 30.0619,
    startDate: '2025-04-01T10:00:00Z',
    endDate: '2025-04-01T12:00:00Z',
    categoryId: 1,
    address: 'Test Address',
    maxParticipants: 50
  };

  const testRating = {
    rating: 4,
    review: 'Great event! Really enjoyed it.'
  };

  beforeAll(async () => {
    // Clean up and create test user
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = userResponse.body.data.token;
    userId = userResponse.body.data.user.id;

    // Create test event
    const eventResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testEvent);

    eventId = eventResponse.body.data.id;

    // Register user for the event
    await request(app)
      .post(`/api/events/${eventId}/register`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM events WHERE creator_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await db.pool.end();
  });

  describe('POST /api/events/:eventId/ratings', () => {
    it('should create a new rating', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRating);

      expect(response.status).toBe(201);
      expect(response.body.data.rating.rating).toBe(testRating.rating);
      expect(response.body.data.rating.review).toBe(testRating.review);
      expect(response.body.data.stats).toHaveProperty('average_rating');
    });

    it('should update existing rating', async () => {
      const updatedRating = {
        rating: 5,
        review: 'Updated review: Even better than I thought!'
      };

      const response = await request(app)
        .post(`/api/events/${eventId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedRating);

      expect(response.status).toBe(200);
      expect(response.body.data.rating.rating).toBe(updatedRating.rating);
      expect(response.body.data.rating.review).toBe(updatedRating.review);
    });

    it('should not allow rating without participation', async () => {
      // Create another event but don't register
      const newEventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testEvent,
          title: 'Another Test Event'
        });

      const response = await request(app)
        .post(`/api/events/${newEventResponse.body.data.id}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRating);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/events/:eventId/ratings', () => {
    it('should get event ratings', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/ratings`);

      expect(response.status).toBe(200);
      expect(response.body.data.ratings).toBeInstanceOf(Array);
      expect(response.body.data.stats).toHaveProperty('average_rating');
      expect(response.body.data.ratings[0]).toHaveProperty('reviewer_name');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/ratings`)
        .query({ limit: 5, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.data.ratings.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/events/:eventId/ratings/user', () => {
    it('should get user\'s rating', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/ratings/user`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.rating).toBe(5);
    });
  });

  describe('DELETE /api/events/:eventId/ratings', () => {
    it('should delete user\'s rating', async () => {
      const response = await request(app)
        .delete(`/api/events/${eventId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats.total_ratings).toBe(0);
    });

    it('should return 404 for non-existent rating', async () => {
      const response = await request(app)
        .delete(`/api/events/${eventId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
