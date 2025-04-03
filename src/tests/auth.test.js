const request = require('supertest');
const app = require('../app');
const db = require('../config/database');

describe('Authentication', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    preferredLanguage: 'en',
    latitude: -1.9441,
    longitude: 30.0619
  };

  beforeAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await db.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not register a user with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/location', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = response.body.data.token;
    });

    it('should update user location', async () => {
      const newLocation = {
        latitude: -1.9500,
        longitude: 30.0700
      };

      const response = await request(app)
        .put('/api/auth/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newLocation);

      expect(response.status).toBe(200);
      expect(response.body.data.latitude).toBe(newLocation.latitude);
      expect(response.body.data.longitude).toBe(newLocation.longitude);
    });

    it('should not update location without auth', async () => {
      const response = await request(app)
        .put('/api/auth/location')
        .send({
          latitude: -1.9500,
          longitude: 30.0700
        });

      expect(response.status).toBe(401);
    });
  });
});
