# Event Locator Application

A multi-user event locator application with geospatial features, internationalization support, and real-time notifications.

## Features

- **User Management**
  - Secure registration and login with JWT authentication
  - User profile management with location settings
  - Preference management for event categories and notification radius
  - Favorite events tracking

- **Event Management**
  - Create, read, update, and delete events
  - Location-based event search using Haversine formula
  - Category filtering and pagination
  - Event registration and participant management
  - Event ratings and reviews

- **Location Features**
  - Find events within a specified radius
  - Distance calculation from user's location
  - Interactive map display with Google Maps integration

- **Multilingual Support**
  - English and Kinyarwanda language support
  - User-selectable language preference
  - Internationalized event categories and notifications

- **Notification System**
  - Real-time notifications using Redis Pub/Sub
  - Notifications for nearby events matching user preferences
  - Read/unread status tracking

## Tech Stack

- **Backend**
  - Node.js & Express.js
  - PostgreSQL with PostGIS for geospatial data
  - Redis for caching and pub/sub messaging
  - JWT for authentication
  - bcryptjs for password hashing

- **Frontend**
  - HTML5, CSS3, JavaScript
  - Bootstrap 5 for responsive design
  - Google Maps API for map visualization

- **Internationalization**
  - i18next for language support

- **Testing**
  - Jest for unit testing
  - Supertest for API testing

## Database Schema

The application uses a relational database with the following main tables:

- **users**: Stores user information including authentication details and location
- **events**: Contains event details including location, dates, and category
- **categories**: Predefined event categories in multiple languages
- **participants**: Tracks event registrations
- **ratings**: Stores user ratings and reviews for events
- **user_preferences**: Manages user category preferences and notification settings
- **favorite_events**: Tracks user's favorite events
- **notifications**: Stores user notifications

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 15 with PostGIS extension
- Redis >= 7

## Environment Variables

Create a `.env` file with the following variables:

```makefile
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=event_locator

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/event-locator-app.git
   cd event-locator-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up PostgreSQL with PostGIS:

   a. Install PostgreSQL 15 or later
   
   b. Install PostGIS extension:
   
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install postgresql-15-postgis-3
   
   # On Windows
   # Run the included postgresql-installer.exe or download from https://postgis.net/windows_downloads/
   ```
   
   c. Create the database:
   
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE event_locator;
   
   # Connect to the new database
   \c event_locator
   
   # Install PostGIS extension
   CREATE EXTENSION postgis;
   
   # Verify PostGIS is installed
   SELECT PostGIS_version();
   ```

4. Set up Redis:

   a. Install Redis Server:
   
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install redis-server
   
   # On Windows
   # Download from https://github.com/tporadowski/redis/releases
   ```
   
   b. Start Redis server:
   
   ```bash
   # On Linux
   sudo systemctl start redis-server
   
   # On Windows
   # Run redis-server.exe
   ```

5. Create a `.env` file with required environment variables (use `.env.example` as a template)

6. Run database setup script:

   ```bash
   node setup-db.js
   ```

7. Start the server:

   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

8. Access the application:
   - API: http://localhost:3000/api
   - API Documentation: http://localhost:3000/api-docs
   - Frontend: http://localhost:3000

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test files
npm test -- src/tests/auth.test.js
```

### Setting up the test environment:

1. Create a test database:

   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create test database
   CREATE DATABASE event_locator_test;
   
   # Connect to the test database
   \c event_locator_test
   
   # Install PostGIS extension
   CREATE EXTENSION postgis;
   ```

2. Create a `.env.test` file with test configuration

3. Run test setup:

   ```bash
   node setup-test-db.js
   ```

## Internationalization (i18n)

The application supports English (en) and Kinyarwanda (rw) languages. Translation files are located in:

```
src/locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── events.json
│   ├── validation.json
│   ├── notifications.json
│   └── ratings.json
└── rw/
    ├── common.json
    ├── auth.json
    ├── events.json
    ├── validation.json
    ├── notifications.json
    └── ratings.json
```

To add a new language:

1. Create a new folder under `src/locales/` with the language code
2. Copy and translate the JSON files from an existing language
3. Add the language code to the `preload` array in `src/middleware/i18n.middleware.js`

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `PUT /api/auth/location` - Update user location

### Events

- `GET /api/events/search` - Search events with filters
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event
- `POST /api/events/:id/register` - Register for an event
- `DELETE /api/events/:id/register` - Unregister from an event

### User Preferences

- `GET /api/users/preferences` - Get user preferences
- `PUT /api/users/preferences` - Update user preferences
- `GET /api/users/events/favorites` - Get favorite events
- `POST /api/users/events/:id/favorite` - Add event to favorites
- `DELETE /api/users/events/:id/favorite` - Remove event from favorites

### Ratings

- `GET /api/events/:id/ratings` - Get event ratings
- `POST /api/events/:id/ratings` - Create/update a rating
- `DELETE /api/events/:id/ratings` - Delete a rating

### Notifications

- `GET /api/users/notifications` - Get user notifications
- `PUT /api/users/notifications/:id/read` - Mark notification as read

## Project Structure

```text
event-locator-app/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── database/         # Database migrations and setup
│   ├── middleware/       # Express middleware
│   ├── models/           # Data models
│   ├── public/           # Static files
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── tests/            # Unit tests
│   ├── utils/            # Utility functions
│   └── app.js            # Express app setup
├── .env                  # Environment variables
├── package.json          # Dependencies and scripts
└── README.md             # Project documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
