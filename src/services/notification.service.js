const db = require('../config/database');
const redisClient = require('../config/redis');

class NotificationService {
  static async checkUpcomingEvents() {
    try {
      // Find events starting in the next 24 hours
      const query = `
        WITH upcoming_events AS (
          SELECT 
            e.id,
            e.title,
            e.description,
            e.start_date,
            e.location,
            e.category_id,
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
          u.preferred_language,
          ST_Distance(
            ue.location,
            u.location
          ) / 1000 as distance_km
        FROM upcoming_events ue
        CROSS JOIN users u
        JOIN user_event_preferences uep 
          ON u.id = uep.user_id 
          AND ue.category_id = uep.category_id
        WHERE ST_DWithin(
          ue.location,
          u.location,
          uep.notification_radius * 1000
        )
        AND NOT EXISTS (
          -- Exclude users already notified
          SELECT 1 FROM event_notifications en
          WHERE en.event_id = ue.id
          AND en.user_id = u.id
        )`;

      const { rows: notifications } = await db.query(query);

      // Send notifications through Redis
      for (const notification of notifications) {
        const message = {
          type: 'upcoming_event',
          data: {
            eventId: notification.id,
            userId: notification.user_id,
            title: notification.title,
            startDate: notification.start_date,
            categoryName: notification[`category_name_${notification.preferred_language}`],
            distanceKm: Math.round(notification.distance_km * 10) / 10
          }
        };

        await redisClient.publish('notifications', JSON.stringify(message));

        // Record notification
        await db.query(`
          INSERT INTO event_notifications (event_id, user_id, sent_at)
          VALUES ($1, $2, NOW())`,
          [notification.id, notification.user_id]
        );
      }

      return notifications.length;
    } catch (error) {
      console.error('Error checking upcoming events:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId, limit = 10, offset = 0) {
    const query = `
      SELECT 
        en.id,
        en.event_id,
        en.sent_at,
        e.title,
        e.start_date,
        c.name_en as category_name_en,
        c.name_rw as category_name_rw,
        ST_Distance(
          e.location,
          u.location
        ) / 1000 as distance_km
      FROM event_notifications en
      JOIN events e ON en.event_id = e.id
      JOIN categories c ON e.category_id = c.id
      JOIN users u ON en.user_id = u.id
      WHERE en.user_id = $1
      ORDER BY en.sent_at DESC
      LIMIT $2 OFFSET $3`;

    const { rows } = await db.query(query, [userId, limit, offset]);
    return rows;
  }
}

module.exports = NotificationService;
