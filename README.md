# Event Locator Application

A multi-user event locator application with geospatial features, internationalization support, and real-time notifications.

## Features

- User authentication and authorization
- Event management with geospatial search
- Category-based filtering
- Multilingual support (i18n)
- Real-time notifications using Redis Pub/Sub
- Comprehensive unit testing

## Tech Stack

- Node.js & Express.js
- PostgreSQL with PostGIS for geospatial data
- Redis for caching and pub/sub
- i18next for internationalization
- Jest for testing

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 15 with PostGIS extension
- Redis >= 7

## Setup

1. Clone the repository

2. Install dependencies:

```bash
npm install
```

3. Create a .env file with required environment variables

4. Run database migrations:

```bash
npm run migrate
```

5. Start the server:

```bash
npm run dev
```

## Testing

Run the test suite:

```bash
npm test
```

## API Documentation

API documentation will be available at `/api-docs` when running the server.
