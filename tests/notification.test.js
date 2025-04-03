const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const redis = require('../src/config/redis');

describe('Notification System', () => {
  let testUser;
  let authToken;
  let testNotification;
  
  beforeAll(async () => {
    // Create test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Notification Test User',
        email: 'notification-test@example.com',
        password: 'Password123!',
        preferredLanguage: 'en',
        latitude: -1.9441,
        longitude: 30.0619
      });
    
    testUser = userRes.body.data.user;
    authToken = userRes.body.data.token;
    
    // Create a test notification directly in the database
    const notificationRes = await db.query(
      `INSERT INTO notifications (recipient_id, type, content, is_read, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [testUser.id, 'TEST', JSON.stringify({ message: 'Test notification' }), false]
    );
    
    testNotification = notificationRes.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM users WHERE email = $1)', ['notification-test@example.com']);
    await db.query('DELETE FROM users WHERE email = $1', ['notification-test@example.com']);
    await redis.quit();
    await db.end();
  });

  describe('GET /api/notifications', () => {
    it('should get user notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toBeDefined();
      expect(res.body.data.notifications.length).toBeGreaterThan(0);
      
      // Check if our test notification is in the results
      const foundNotification = res.body.data.notifications.find(n => n.id === testNotification.id);
      expect(foundNotification).toBeDefined();
      expect(foundNotification.is_read).toBe(false);
    });

    it('should filter notifications by read status', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .query({ read: false })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // All returned notifications should be unread
      res.body.data.notifications.forEach(notification => {
        expect(notification.is_read).toBe(false);
      });
      
      // Our test notification should be included
      const foundNotification = res.body.data.notifications.find(n => n.id === testNotification.id);
      expect(foundNotification).toBeDefined();
    });

    it('should support pagination', async () => {
      // Create multiple test notifications
      const notificationPromises = [];
      for (let i = 0; i < 5; i++) {
        notificationPromises.push(
          db.query(
            `INSERT INTO notifications (recipient_id, type, content, is_read, created_at) 
             VALUES ($1, $2, $3, $4, NOW())`,
            [testUser.id, 'TEST', JSON.stringify({ message: `Pagination test ${i}` }), false]
          )
        );
      }
      await Promise.all(notificationPromises);
      
      // Test first page with limit
      const res1 = await request(app)
        .get('/api/notifications')
        .query({ page: 1, limit: 3 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.statusCode).toEqual(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.notifications.length).toBeLessThanOrEqual(3);
      expect(res1.body.data.pagination).toBeDefined();
      expect(res1.body.data.pagination.page).toBe(1);
      expect(res1.body.data.pagination.limit).toBe(3);
      
      // Test second page
      const res2 = await request(app)
        .get('/api/notifications')
        .query({ page: 2, limit: 3 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res2.statusCode).toEqual(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.pagination.page).toBe(2);
      
      // Ensure we got different notifications on different pages
      if (res1.body.data.notifications.length > 0 && res2.body.data.notifications.length > 0) {
        const firstPageIds = res1.body.data.notifications.map(n => n.id);
        const secondPageIds = res2.body.data.notifications.map(n => n.id);
        
        // Check that no IDs from the first page appear in the second page
        const overlap = secondPageIds.filter(id => firstPageIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_read).toBe(true);
      
      // Verify in the database
      const dbCheck = await db.query(
        'SELECT is_read FROM notifications WHERE id = $1',
        [testNotification.id]
      );
      
      expect(dbCheck.rows[0].is_read).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .patch('/api/notifications/99999/read')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent accessing another user\'s notification', async () => {
      // Create another user
      const anotherUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another Test User',
          email: 'another-test@example.com',
          password: 'Password123!',
          preferredLanguage: 'en'
        });
      
      const anotherUserToken = anotherUserRes.body.data.token;
      
      // Try to access the first user's notification
      const res = await request(app)
        .patch(`/api/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${anotherUserToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      
      // Clean up
      await db.query('DELETE FROM users WHERE email = $1', ['another-test@example.com']);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      // First, create some unread notifications
      await db.query(
        `INSERT INTO notifications (recipient_id, type, content, is_read, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [testUser.id, 'TEST', JSON.stringify({ message: 'Bulk read test' }), false]
      );
      
      // Get count of unread notifications before the test
      const beforeCount = await db.query(
        'SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false',
        [testUser.id]
      );
      
      const unreadCountBefore = parseInt(beforeCount.rows[0].count);
      expect(unreadCountBefore).toBeGreaterThan(0);
      
      // Mark all as read
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBeGreaterThanOrEqual(unreadCountBefore);
      
      // Verify in the database
      const afterCount = await db.query(
        'SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false',
        [testUser.id]
      );
      
      expect(parseInt(afterCount.rows[0].count)).toBe(0);
    });
  });

  describe('Notification Preferences', () => {
    it('should get user notification preferences', async () => {
      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notificationRadius).toBeDefined();
    });

    it('should update notification preferences', async () => {
      const newPreferences = {
        notificationRadius: 25,
        categoryIds: [1, 2] // Assuming these category IDs exist
      };
      
      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPreferences);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Verify the changes
      const checkRes = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.statusCode).toEqual(200);
      expect(checkRes.body.data.notificationRadius).toBe(newPreferences.notificationRadius);
      
      // Check if categories were updated
      if (checkRes.body.data.categories) {
        const categoryIds = checkRes.body.data.categories.map(c => c.id);
        newPreferences.categoryIds.forEach(id => {
          expect(categoryIds).toContain(id);
        });
      }
    });

    it('should validate notification preferences', async () => {
      const invalidPreferences = {
        notificationRadius: 200 // Assuming this exceeds the maximum allowed
      };
      
      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });
  });
});
