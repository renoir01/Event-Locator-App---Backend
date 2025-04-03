const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const redis = require('../config/redis');
const NotificationService = require('../services/notification.service');

describe('Notification System', () => {
  let authToken;
  let userId;
  let eventId;

  const testUser = {
    email: 'notification-test@example.com',
    password: 'password123',
    name: 'Notification Test User',
    preferredLanguage: 'en',
    latitude: -1.9441,
    longitude: 30.0619
  };

  const testEvent = {
    title: 'Test Event for Notifications',
    description: 'A test event description',
    latitude: -1.9441,
    longitude: 30.0619,
    startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 90000000).toISOString(),
    categoryId: 1,
    address: 'Test Address',
    maxParticipants: 50
  };

  const testPreferences = {
    categoryIds: [1],
    notificationRadius: 10
  };

  beforeAll(async () => {
    // Clean up and create test user
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = response.body.data.token;
    userId = response.body.data.user.id;

    // Set user preferences
    await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testPreferences);

    // Create test event
    const eventResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testEvent);

    eventId = eventResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM events WHERE creator_id = $1', [userId]);
    await db.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await redis.quit();
    await db.pool.end();
  });

  describe('GET /api/users/notifications', () => {
    it('should return empty notifications initially', async () => {
      const response = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should create notification for nearby event', async () => {
      // Manually trigger notification creation
      const notificationService = new NotificationService();
      await notificationService.processEventNotifications(eventId);

      // Check if notification was created
      const response = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('event_id', eventId);
    });

    it('should not create duplicate notifications', async () => {
      // Trigger notification again
      const notificationService = new NotificationService();
      await notificationService.processEventNotifications(eventId);

      // Check notification count
      const response = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      // Should still have the same number of notifications
      const initialCount = response.body.data.length;

      // Trigger again
      await notificationService.processEventNotifications(eventId);

      const secondResponse = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(secondResponse.body.data.length).toBe(initialCount);
    });
  });

  describe('PUT /api/users/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // Get notifications
      const notificationsResponse = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      const notificationId = notificationsResponse.body.data[0].id;

      // Mark as read
      const response = await request(app)
        .put(`/api/users/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.read).toBe(true);

      // Verify it's marked as read
      const updatedResponse = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      const updatedNotification = updatedResponse.body.data.find(n => n.id === notificationId);
      expect(updatedNotification.read).toBe(true);
    });

    it('should not mark other users notifications as read', async () => {
      // Create another user
      const anotherUser = {
        email: 'another-notification-test@example.com',
        password: 'password123',
        name: 'Another Test User'
      };

      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUser);

      const anotherToken = userResponse.body.data.token;

      // Get notifications from first user
      const notificationsResponse = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      const notificationId = notificationsResponse.body.data[0].id;

      // Try to mark as read with another user
      const response = await request(app)
        .put(`/api/users/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(404);

      // Clean up
      await db.query('DELETE FROM users WHERE email = $1', [anotherUser.email]);
    });
  });

  describe('Redis Pub/Sub', () => {
    it('should publish event creation message', async () => {
      // Create a mock subscriber
      const mockSubscriber = redis.duplicate();
      let messageReceived = false;

      await mockSubscriber.subscribe('event-notifications');
      
      mockSubscriber.on('message', (channel, message) => {
        if (channel === 'event-notifications') {
          const data = JSON.parse(message);
          if (data.eventId) {
            messageReceived = true;
          }
        }
      });

      // Create a new event to trigger notification
      const newEvent = {
        ...testEvent,
        title: 'Another Test Event for Redis'
      };

      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEvent);

      // Wait for message to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(messageReceived).toBe(true);
      
      // Clean up
      await mockSubscriber.unsubscribe();
      await mockSubscriber.quit();
    });
  });
});
