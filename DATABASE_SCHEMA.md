# Event Locator Database Schema

This document outlines the database schema for the Event Locator application, including tables, relationships, and key fields.

## Database Tables

### Users

Stores user account information and preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR(255) | User's full name |
| email | VARCHAR(255) | User's email address (unique) |
| password | VARCHAR(255) | Hashed password |
| preferred_language | VARCHAR(10) | User's preferred language (en/rw) |
| latitude | DECIMAL(10,7) | User's latitude |
| longitude | DECIMAL(10,7) | User's longitude |
| created_at | TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Categories

Predefined event categories with multilingual support.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name_en | VARCHAR(100) | Category name in English |
| name_rw | VARCHAR(100) | Category name in Kinyarwanda |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Events

Stores event information including location and details.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| title | VARCHAR(255) | Event title |
| description | TEXT | Event description |
| address | VARCHAR(255) | Physical address |
| latitude | DECIMAL(10,7) | Event latitude |
| longitude | DECIMAL(10,7) | Event longitude |
| start_date | TIMESTAMP | Event start date and time |
| end_date | TIMESTAMP | Event end date and time |
| category_id | INTEGER | Foreign key to categories |
| creator_id | INTEGER | Foreign key to users |
| max_participants | INTEGER | Maximum number of participants |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Participants

Tracks user registrations for events.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| event_id | INTEGER | Foreign key to events |
| registration_date | TIMESTAMP | Registration timestamp |
| status | VARCHAR(50) | Registration status |

### Ratings

Stores user ratings and reviews for events.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| event_id | INTEGER | Foreign key to events |
| rating | INTEGER | Rating value (1-5) |
| review | TEXT | Written review |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### User Preferences

Stores user category preferences and notification settings.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| notification_radius | INTEGER | Notification radius in km |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### User Category Preferences

Many-to-many relationship between users and their preferred categories.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| category_id | INTEGER | Foreign key to categories |

### Favorite Events

Tracks user's favorite events.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| event_id | INTEGER | Foreign key to events |
| created_at | TIMESTAMP | When the event was favorited |

### Notifications

Stores notifications sent to users.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| event_id | INTEGER | Foreign key to events |
| title | VARCHAR(255) | Notification title |
| message | TEXT | Notification message |
| read | BOOLEAN | Whether notification has been read |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## Relationships

- **Users to Events**: One-to-many (a user can create multiple events)
- **Categories to Events**: One-to-many (a category can have multiple events)
- **Users to Participants**: One-to-many (a user can register for multiple events)
- **Events to Participants**: One-to-many (an event can have multiple participants)
- **Users to Ratings**: One-to-many (a user can rate multiple events)
- **Events to Ratings**: One-to-many (an event can have multiple ratings)
- **Users to User Preferences**: One-to-one (a user has one preference record)
- **Users to User Category Preferences**: One-to-many (a user can prefer multiple categories)
- **Categories to User Category Preferences**: One-to-many (a category can be preferred by multiple users)
- **Users to Favorite Events**: One-to-many (a user can have multiple favorite events)
- **Events to Favorite Events**: One-to-many (an event can be favorited by multiple users)
- **Users to Notifications**: One-to-many (a user can receive multiple notifications)
- **Events to Notifications**: One-to-many (an event can generate multiple notifications)

## Indexes

The following indexes are created to optimize query performance:

- **users**: email (unique)
- **events**: (latitude, longitude) - for geospatial queries
- **events**: category_id, creator_id, start_date
- **participants**: (user_id, event_id) - unique composite
- **ratings**: (user_id, event_id) - unique composite
- **user_category_preferences**: (user_id, category_id) - unique composite
- **favorite_events**: (user_id, event_id) - unique composite
- **notifications**: user_id, read

## Entity Relationship Diagram

```
Users
+---------------+
| id            |
| name          |
| email         |
| password      |
| pref_language |
| latitude      |
| longitude     |
| created_at    |
| updated_at    |
+---------------+
       |
       |
       +-------------------+
       |                   |
       v                   v
    Events             User Preferences
+---------------+     +------------------+
| id            |     | id               |
| title         |     | user_id          |
| description   |     | notification_rad |
| address       |     | created_at       |
| latitude      |     | updated_at       |
| longitude     |     +------------------+
| start_date    |            |
| end_date      |            |
| category_id   |            v
| creator_id    |    User Category Prefs
| max_part      |     +------------------+
| created_at    |     | id               |
| updated_at    |     | user_id          |
+---------------+     | category_id      |
       |              +------------------+
       |                      ^
       v                      |
  Participants         Categories
+---------------+     +------------------+
| id            |     | id               |
| user_id       |     | name_en          |
| event_id      |     | name_rw          |
| reg_date      |     | created_at       |
| status        |     | updated_at       |
+---------------+     +------------------+
                             |
       +---------------------+
       |
       v
    Ratings
+---------------+
| id            |
| user_id       |
| event_id      |
| rating        |
| review        |
| created_at    |
| updated_at    |
+---------------+

Favorite Events          Notifications
+---------------+       +---------------+
| id            |       | id            |
| user_id       |       | user_id       |
| event_id      |       | event_id      |
| created_at    |       | title         |
+---------------+       | message       |
                        | read          |
                        | created_at    |
                        | updated_at    |
                        +---------------+
```
