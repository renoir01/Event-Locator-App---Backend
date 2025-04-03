const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Event Registration System', () => {
  let testUser;
  let testUser2;
  let authToken;
  let authToken2;
  let testEvent;

  beforeAll(async () => {
    // Create first test user (event creator)
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Registration Test Creator',
        email: 'registration-test-creator@example.com',
        password: 'Password123!',
        preferredLanguage: 'en',
        latitude: -1.9441,
        longitude: 30.0619
      });

    testUser = userRes.body.data.user;
    authToken = userRes.body.data.token;

    // Create second test user (participant)
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Registration Test Participant',
        email: 'registration-test-participant@example.com',
        password: 'Password123!',
        preferredLanguage: 'en',
        latitude: -1.9441,
        longitude: 30.0619
      });

    testUser2 = user2Res.body.data.user;
    authToken2 = user2Res.body.data.token;

    // Create test event with limited capacity directly in the database using PostGIS
    const startDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
    const endDate = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow
    
    const eventResult = await db.query(`
      INSERT INTO events (
        creator_id, 
        title, 
        description, 
        location, 
        address, 
        start_date, 
        end_date, 
        category_id, 
        max_participants
      ) VALUES (
        $1, 
        $2, 
        $3, 
        ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, 
        $6, 
        $7, 
        $8, 
        $9, 
        $10
      ) RETURNING *
    `, [
      testUser.id,
      'Registration Test Event',
      'Test event for registration system',
      30.0700, // longitude
      -1.9500, // latitude
      'Kigali Convention Center, Rwanda',
      startDate,
      endDate,
      1, // category ID
      2 // max participants
    ]);

    testEvent = eventResult.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM event_participants WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%registration-test%']);
    await db.query('DELETE FROM events WHERE title = $1', ['Registration Test Event']);
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%registration-test%']);
  });

  describe('POST /api/events/:id/register', () => {
    it('should allow a user to register for an event', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('registered');

      // Verify in the database
      const dbCheck = await db.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [testEvent.id, testUser2.id]
      );

      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].status).toBe('registered');
    });

    it('should prevent duplicate registrations', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ALREADY_REGISTERED');
    });

    it('should handle event capacity limits', async () => {
      // Create a third user
      const user3Res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Registration Test User 3',
          email: 'registration-test-user3@example.com',
          password: 'Password123!',
          preferredLanguage: 'en',
          latitude: -1.9441,
          longitude: 30.0619
        });

      const authToken3 = user3Res.body.data.token;

      // Register the event creator (first slot)
      await request(app)
        .post(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to register the third user (should be waitlisted)
      const res = await request(app)
        .post(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken3}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('waitlisted');

      // Verify in the database
      const dbCheck = await db.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [testEvent.id, user3Res.body.data.user.id]
      );

      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].status).toBe('waitlisted');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .post('/api/events/99999/register')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent.id}/register`);

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/events/:id/register', () => {
    it('should allow a user to unregister from an event', async () => {
      const res = await request(app)
        .delete(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);

      // Verify in the database
      const dbCheck = await db.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [testEvent.id, testUser2.id]
      );

      expect(dbCheck.rows.length).toBe(0);
    });

    it('should handle waitlist promotions when a registered user unregisters', async () => {
      // Create a fourth user
      const user4Res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Registration Test User 4',
          email: 'registration-test-user4@example.com',
          password: 'Password123!',
          preferredLanguage: 'en',
          latitude: -1.9441,
          longitude: 30.0619
        });

      const authToken4 = user4Res.body.data.token;
      const user4Id = user4Res.body.data.user.id;

      // Register the fourth user (should be waitlisted)
      await request(app)
        .post(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken4}`);

      // Get the third user's ID
      const user3Res = await db.query(
        'SELECT id FROM users WHERE email = $1',
        ['registration-test-user3@example.com']
      );
      const user3Id = user3Res.rows[0].id;

      // Verify both users' initial statuses
      const initialStatuses = await db.query(
        'SELECT user_id, status FROM event_participants WHERE event_id = $1 AND user_id IN ($2, $3)',
        [testEvent.id, user3Id, user4Id]
      );

      const user3Status = initialStatuses.rows.find(r => r.user_id === user3Id)?.status;
      const user4Status = initialStatuses.rows.find(r => r.user_id === user4Id)?.status;

      expect(user3Status).toBe('waitlisted');
      expect(user4Status).toBe('waitlisted');

      // Unregister the event creator
      await request(app)
        .delete(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      // Check if the first waitlisted user was promoted
      const afterStatuses = await db.query(
        'SELECT user_id, status FROM event_participants WHERE event_id = $1 AND user_id IN ($2, $3)',
        [testEvent.id, user3Id, user4Id]
      );

      const user3StatusAfter = afterStatuses.rows.find(r => r.user_id === user3Id)?.status;
      const user4StatusAfter = afterStatuses.rows.find(r => r.user_id === user4Id)?.status;

      expect(user3StatusAfter).toBe('registered'); // Should be promoted
      expect(user4StatusAfter).toBe('waitlisted'); // Should still be waitlisted
    });

    it('should return 404 when trying to unregister from a non-registered event', async () => {
      // Create a fifth user who hasn't registered
      const user5Res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Registration Test User 5',
          email: 'registration-test-user5@example.com',
          password: 'Password123!',
          preferredLanguage: 'en',
          latitude: -1.9441,
          longitude: 30.0619
        });

      const authToken5 = user5Res.body.data.token;

      const res = await request(app)
        .delete(`/api/events/${testEvent.id}/register`)
        .set('Authorization', `Bearer ${authToken5}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .delete(`/api/events/${testEvent.id}/register`);

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });
  });
});
