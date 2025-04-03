const db = require('../config/database');
const redisClient = require('../config/redis');
const logger = require('../config/logger');

class NotificationService {
  static async checkUpcomingEvents() {
    try {
      logger.info('Checking for upcoming events to send notifications');
      
      // Find events starting in the next 24 hours
      const query = `
        WITH upcoming_events AS (
          SELECT 
            e.id,
            e.title,
            e.description,
            e.start_date,
            e.end_date,
            ST_X(e.location::geometry) as longitude,
            ST_Y(e.location::geometry) as latitude,
            e.category_id,
            e.address,
            c.name_en as category_name_en,
            c.name_rw as category_name_rw
          FROM events e
          JOIN categories c ON e.category_id = c.id
          WHERE e.start_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        )
        SELECT 
          ue.*,
          u.id as user_id,
          u.email,
          u.name,
          u.preferred_language,
          ST_Distance(
            u.location,
            ST_SetSRID(ST_MakePoint(ue.longitude, ue.latitude), 4326)::geography
          ) / 1000 as distance_km
        FROM upcoming_events ue
        CROSS JOIN users u
        JOIN user_preferences up ON u.id = up.user_id
        LEFT JOIN user_category_preferences ucp ON u.id = ucp.user_id AND ue.category_id = ucp.category_id
        WHERE ST_Distance(
          u.location,
          ST_SetSRID(ST_MakePoint(ue.longitude, ue.latitude), 4326)::geography
        ) / 1000 <= up.notification_radius
        AND (ucp.category_id IS NOT NULL OR NOT EXISTS (
          -- If user has no category preferences, send notifications for all categories
          SELECT 1 FROM user_category_preferences WHERE user_id = u.id
        ))
        AND NOT EXISTS (
          -- Exclude users already notified
          SELECT 1 FROM notifications n
          WHERE n.event_id = ue.id
          AND n.user_id = u.id
          AND n.type = 'event_reminder'
        )`;

      const { rows: notifications } = await db.query(query);
      logger.info(`Found ${notifications.length} notifications to send`);

      // Send notifications through Redis
      for (const notification of notifications) {
        try {
          const message = {
            type: 'event_notification',
            data: {
              eventId: notification.id,
              userId: notification.user_id,
              title: notification.title,
              description: notification.description,
              startDate: notification.start_date,
              address: notification.address,
              distance: parseFloat(notification.distance_km).toFixed(1),
              categoryName: notification.preferred_language === 'rw' 
                ? notification.category_name_rw 
                : notification.category_name_en
            }
          };
          
          await redisClient.publish('notifications', JSON.stringify(message));
          logger.info(`Notification sent to user ${notification.user_id} for event ${notification.id}`);
          
          // Record that notification was sent
          await db.query(
            `INSERT INTO notifications (user_id, event_id, type, message, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              notification.user_id, 
              notification.id, 
              'event_reminder',
              `Event "${notification.title}" starts on ${new Date(notification.start_date).toLocaleString()} at ${notification.address}`,
              false
            ]
          );
        } catch (error) {
          logger.error(`Error sending notification for event ${notification.id} to user ${notification.user_id}:`, error);
          // Continue with other notifications
        }
      }
      
      return notifications.length;
    } catch (error) {
      logger.error('Error checking upcoming events:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId, limit = 10, offset = 0) {
    try {
      const query = `
        SELECT 
          n.id,
          n.type,
          n.message,
          n.is_read,
          n.created_at,
          n.event_id,
          e.title as event_title,
          e.start_date as event_start_date,
          e.address as event_address
        FROM notifications n
        LEFT JOIN events e ON n.event_id = e.id
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const { rows: notifications } = await db.query(query, [userId, limit, offset]);
      
      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`;
      const { rows: countResult } = await db.query(countQuery, [userId]);
      
      return {
        notifications,
        total: parseInt(countResult[0].total)
      };
    } catch (error) {
      logger.error(`Error fetching notifications for user ${userId}:`, error);
      throw error;
    }
  }

  static async markNotificationAsRead(notificationId, userId) {
    try {
      const query = `
        UPDATE notifications
        SET is_read = true
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      
      const { rows } = await db.query(query, [notificationId, userId]);
      return rows.length > 0;
    } catch (error) {
      logger.error(`Error marking notification ${notificationId} as read:`, error);
      throw error;
    }
  }

  static async initSubscribers() {
    try {
      logger.info('Initializing Redis subscribers');
      
      const subscriber = redisClient.duplicate();
      
      subscriber.on('message', async (channel, message) => {
        try {
          const data = JSON.parse(message);
          logger.info(`Received message on channel ${channel}:`, data);
          
          if (channel === 'notifications' && data.type === 'event_notification') {
            // Handle notification delivery (e.g., send email, push notification)
            logger.info(`Processing notification for user ${data.data.userId}`);
          }
        } catch (error) {
          logger.error('Error processing Redis message:', error);
        }
      });
      
      subscriber.subscribe('notifications');
      logger.info('Subscribed to notifications channel');
      
      return subscriber;
    } catch (error) {
      logger.error('Error initializing Redis subscribers:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
