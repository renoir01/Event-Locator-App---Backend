/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password_hash
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the user
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email address
 *         password_hash:
 *           type: string
 *           description: Hashed password (never returned in responses)
 *         name:
 *           type: string
 *           description: The user's full name
 *         preferred_language:
 *           type: string
 *           enum: [en, rw]
 *           default: en
 *           description: The user's preferred language
 *         location:
 *           type: object
 *           description: The user's geographic location (PostGIS Point)
 *         latitude:
 *           type: number
 *           format: float
 *           description: The user's latitude (used when PostGIS is not available)
 *         longitude:
 *           type: number
 *           format: float
 *           description: The user's longitude (used when PostGIS is not available)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the user was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the user was last updated
 *       example:
 *         id: 1
 *         email: user@example.com
 *         name: John Doe
 *         preferred_language: en
 *         latitude: -1.9441
 *         longitude: 30.0619
 *         created_at: 2025-04-01T12:00:00Z
 *         updated_at: 2025-04-01T12:00:00Z
 *
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - location
 *         - start_date
 *         - end_date
 *         - address
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the event
 *         title:
 *           type: string
 *           description: The title of the event
 *         description:
 *           type: string
 *           description: Detailed description of the event
 *         location:
 *           type: object
 *           description: The geographic location of the event (PostGIS Point)
 *         latitude:
 *           type: number
 *           format: float
 *           description: The event's latitude (used when PostGIS is not available)
 *         longitude:
 *           type: number
 *           format: float
 *           description: The event's longitude (used when PostGIS is not available)
 *         start_date:
 *           type: string
 *           format: date-time
 *           description: The start date and time of the event
 *         end_date:
 *           type: string
 *           format: date-time
 *           description: The end date and time of the event
 *         creator_id:
 *           type: integer
 *           description: The ID of the user who created the event
 *         category_id:
 *           type: integer
 *           description: The ID of the event category
 *         address:
 *           type: string
 *           description: The physical address of the event
 *         max_participants:
 *           type: integer
 *           description: Maximum number of participants allowed
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the event was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the event was last updated
 *       example:
 *         id: 1
 *         title: Tech Conference
 *         description: Annual technology conference with workshops and networking
 *         latitude: -1.9441
 *         longitude: 30.0619
 *         start_date: 2025-05-15T09:00:00Z
 *         end_date: 2025-05-15T17:00:00Z
 *         creator_id: 1
 *         category_id: 2
 *         address: Kigali Convention Center, Kigali, Rwanda
 *         max_participants: 200
 *         created_at: 2025-04-01T12:00:00Z
 *         updated_at: 2025-04-01T12:00:00Z
 *
 *     Category:
 *       type: object
 *       required:
 *         - name_en
 *         - name_rw
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the category
 *         name_en:
 *           type: string
 *           description: The category name in English
 *         name_rw:
 *           type: string
 *           description: The category name in Kinyarwanda
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the category was created
 *       example:
 *         id: 1
 *         name_en: Technology
 *         name_rw: Ikoranabuhanga
 *         created_at: 2025-04-01T12:00:00Z
 *
 *     Rating:
 *       type: object
 *       required:
 *         - event_id
 *         - user_id
 *         - rating
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the rating
 *         event_id:
 *           type: integer
 *           description: The ID of the rated event
 *         user_id:
 *           type: integer
 *           description: The ID of the user who submitted the rating
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating value from 1 to 5
 *         review:
 *           type: string
 *           description: Optional review text
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the rating was created
 *       example:
 *         id: 1
 *         event_id: 1
 *         user_id: 2
 *         rating: 5
 *         review: Great event with excellent speakers!
 *         created_at: 2025-04-01T12:00:00Z
 *
 *     Notification:
 *       type: object
 *       required:
 *         - user_id
 *         - event_id
 *         - message
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the notification
 *         user_id:
 *           type: integer
 *           description: The ID of the user receiving the notification
 *         event_id:
 *           type: integer
 *           description: The ID of the related event
 *         message:
 *           type: string
 *           description: The notification message
 *         read:
 *           type: boolean
 *           description: Whether the notification has been read
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the notification was created
 *       example:
 *         id: 1
 *         user_id: 1
 *         event_id: 2
 *         message: New event 'Tech Conference' is happening near you!
 *         read: false
 *         created_at: 2025-04-01T12:00:00Z
 */
