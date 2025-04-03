# Event Locator API Documentation

This document provides detailed information about the Event Locator API endpoints, request/response formats, and authentication requirements.

## Base URL

All API endpoints are relative to the base URL:

```text
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication using JSON Web Tokens (JWT). To authenticate, include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

You can obtain a token by registering or logging in.

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

Common error codes:

- `UNAUTHORIZED`: Authentication required or invalid token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `INTERNAL_ERROR`: Server error

## API Endpoints

### Authentication

#### Register a new user

```http
POST /auth/register
```

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "preferredLanguage": "en",
  "latitude": -1.9441,
  "longitude": 30.0619
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "preferred_language": "en",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "created_at": "2023-04-01T12:00:00Z"
    }
  }
}
```

#### Login

```http
POST /auth/login
```

Request body:

```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "preferred_language": "en",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "created_at": "2023-04-01T12:00:00Z"
    }
  }
}
```

#### Update user location

```http
PUT /auth/location
```

Authentication: Required

Request body:

```json
{
  "latitude": -1.9442,
  "longitude": 30.0620
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "latitude": -1.9442,
    "longitude": 30.0620
  }
}
```

### Events

#### Search events

```http
GET /events/search
```

Authentication: Optional

Query parameters:

- `q` (optional): Search term
- `latitude` (optional): User latitude
- `longitude` (optional): User longitude
- `radius` (optional): Search radius in kilometers
- `categoryId` (optional): Filter by category ID
- `startDate` (optional): Filter events starting after this date
- `endDate` (optional): Filter events ending before this date
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Music Festival",
      "description": "Annual music festival",
      "address": "Kigali Convention Center",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "start_date": "2023-04-15T18:00:00Z",
      "end_date": "2023-04-15T22:00:00Z",
      "category_id": 1,
      "category_name_en": "Music",
      "category_name_rw": "Umuziki",
      "creator_id": 2,
      "creator_name": "Event Organizer",
      "max_participants": 500,
      "current_participants": 125,
      "distance_km": 1.5,
      "average_rating": 4.8,
      "created_at": "2023-04-01T12:00:00Z"
    },
    // More events...
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "next_offset": 20,
    "has_more": true
  }
}
```

#### Get event details

```http
GET /events/:id
```

Authentication: Optional

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Music Festival",
    "description": "Annual music festival",
    "address": "Kigali Convention Center",
    "latitude": -1.9441,
    "longitude": 30.0619,
    "start_date": "2023-04-15T18:00:00Z",
    "end_date": "2023-04-15T22:00:00Z",
    "category_id": 1,
    "category_name_en": "Music",
    "category_name_rw": "Umuziki",
    "creator_id": 2,
    "creator_name": "Event Organizer",
    "max_participants": 500,
    "current_participants": 125,
    "is_registered": false,
    "is_favorite": false,
    "average_rating": 4.8,
    "created_at": "2023-04-01T12:00:00Z"
  }
}
```

#### Create event

```http
POST /events
```

Authentication: Required

Request body:

```json
{
  "title": "Tech Conference",
  "description": "Annual tech conference",
  "address": "Kigali Innovation Center",
  "latitude": -1.9445,
  "longitude": 30.0625,
  "startDate": "2023-05-20T09:00:00Z",
  "endDate": "2023-05-20T17:00:00Z",
  "categoryId": 2,
  "maxParticipants": 200
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "Tech Conference",
    "description": "Annual tech conference",
    "address": "Kigali Innovation Center",
    "latitude": -1.9445,
    "longitude": 30.0625,
    "start_date": "2023-05-20T09:00:00Z",
    "end_date": "2023-05-20T17:00:00Z",
    "category_id": 2,
    "creator_id": 1,
    "max_participants": 200,
    "created_at": "2023-04-02T14:30:00Z"
  }
}
```

#### Update event

```http
PUT /events/:id
```

Authentication: Required (must be event creator)

Request body (all fields optional):

```json
{
  "title": "Updated Tech Conference",
  "description": "Updated description",
  "address": "New Location",
  "latitude": -1.9446,
  "longitude": 30.0626,
  "startDate": "2023-05-21T09:00:00Z",
  "endDate": "2023-05-21T17:00:00Z",
  "categoryId": 2,
  "maxParticipants": 250
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "Updated Tech Conference",
    "description": "Updated description",
    "address": "New Location",
    "latitude": -1.9446,
    "longitude": 30.0626,
    "start_date": "2023-05-21T09:00:00Z",
    "end_date": "2023-05-21T17:00:00Z",
    "category_id": 2,
    "creator_id": 1,
    "max_participants": 250,
    "created_at": "2023-04-02T14:30:00Z",
    "updated_at": "2023-04-02T15:45:00Z"
  }
}
```

#### Delete event

```http
DELETE /events/:id
```

Authentication: Required (must be event creator)

Response:

```json
{
  "success": true,
  "data": {
    "message": "Event deleted successfully"
  }
}
```

#### Register for event

```http
POST /events/:id/register
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": {
    "status": "registered",
    "event_id": 1,
    "user_id": 1,
    "registration_date": "2023-04-02T16:30:00Z"
  }
}
```

#### Unregister from event

```http
DELETE /events/:id/register
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": {
    "message": "Successfully unregistered from event"
  }
}
```

### User Preferences

#### Get user preferences

```http
GET /users/preferences
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": {
    "notificationRadius": 10,
    "categories": [
      {
        "id": 1,
        "name_en": "Music",
        "name_rw": "Umuziki"
      },
      {
        "id": 3,
        "name_en": "Technology",
        "name_rw": "Ikoranabuhanga"
      }
    ]
  }
}
```

#### Update user preferences

```http
PUT /users/preferences
```

Authentication: Required

Request body:

```json
{
  "categoryIds": [1, 2, 3],
  "notificationRadius": 15
}
```

Response:

```json
{
  "success": true,
  "data": {
    "notificationRadius": 15,
    "categories": [
      {
        "id": 1,
        "name_en": "Music",
        "name_rw": "Umuziki"
      },
      {
        "id": 2,
        "name_en": "Sports",
        "name_rw": "Siporo"
      },
      {
        "id": 3,
        "name_en": "Technology",
        "name_rw": "Ikoranabuhanga"
      }
    ]
  }
}
```

#### Get favorite events

```http
GET /users/events/favorites
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Music Festival",
      "description": "Annual music festival",
      "address": "Kigali Convention Center",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "start_date": "2023-04-15T18:00:00Z",
      "end_date": "2023-04-15T22:00:00Z",
      "category_id": 1,
      "category_name_en": "Music",
      "category_name_rw": "Umuziki",
      "creator_id": 2,
      "creator_name": "Event Organizer",
      "max_participants": 500,
      "current_participants": 125,
      "average_rating": 4.8,
      "created_at": "2023-04-01T12:00:00Z"
    }
    // More favorite events...
  ]
}
```

#### Add event to favorites

```http
POST /users/events/:id/favorite
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": {
    "message": "Event added to favorites"
  }
}
```

#### Remove event from favorites

```http
DELETE /users/events/:id/favorite
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": {
    "message": "Event removed from favorites"
  }
}
```

#### Get registered events

```http
GET /users/events/registered
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Music Festival",
      "description": "Annual music festival",
      "address": "Kigali Convention Center",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "start_date": "2023-04-15T18:00:00Z",
      "end_date": "2023-04-15T22:00:00Z",
      "category_id": 1,
      "category_name_en": "Music",
      "category_name_rw": "Umuziki",
      "creator_id": 2,
      "creator_name": "Event Organizer",
      "registration_date": "2023-04-02T16:30:00Z"
    }
    // More registered events...
  ]
}
```

### Ratings

#### Get event ratings

```http
GET /events/:id/ratings
```

Authentication: Optional

Query parameters:

- `limit` (optional): Number of results per page (default: 10)
- `offset` (optional): Pagination offset (default: 0)

Response:

```json
{
  "success": true,
  "data": {
    "stats": {
      "average_rating": 4.5,
      "total_ratings": 15,
      "rating_distribution": {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        "5": 9
      }
    },
    "ratings": [
      {
        "id": 1,
        "rating": 5,
        "review": "Great event! Really enjoyed it.",
        "reviewer_id": 3,
        "reviewer_name": "Jane Smith",
        "created_at": "2023-04-16T10:30:00Z"
      },
      // More ratings...
    ]
  }
}
```

#### Get user's rating for an event

```http
GET /events/:id/ratings/user
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": {
    "id": 5,
    "rating": 4,
    "review": "Very informative and well-organized event.",
    "created_at": "2023-04-16T14:20:00Z",
    "updated_at": "2023-04-16T14:20:00Z"
  }
}
```

#### Create or update rating

```http
POST /events/:id/ratings
```

Authentication: Required (must have attended the event)

Request body:

```json
{
  "rating": 5,
  "review": "Excellent event! Would definitely attend again."
}
```

Response (new rating):

```json
{
  "success": true,
  "data": {
    "rating": {
      "id": 16,
      "rating": 5,
      "review": "Excellent event! Would definitely attend again.",
      "created_at": "2023-04-16T15:45:00Z"
    },
    "stats": {
      "average_rating": 4.6,
      "total_ratings": 16
    }
  }
}
```

Response (updated rating):

```json
{
  "success": true,
  "data": {
    "rating": {
      "id": 5,
      "rating": 5,
      "review": "Excellent event! Would definitely attend again.",
      "created_at": "2023-04-16T14:20:00Z",
      "updated_at": "2023-04-16T15:45:00Z"
    },
    "stats": {
      "average_rating": 4.6,
      "total_ratings": 15
    }
  }
}
```

#### Delete rating

```http
DELETE /events/:id/ratings
```

Authentication: Required (must be the rating creator)

Response:

```json
{
  "success": true,
  "data": {
    "message": "Rating deleted successfully",
    "stats": {
      "average_rating": 4.5,
      "total_ratings": 14
    }
  }
}
```

### Notifications

#### Get user notifications

```http
GET /users/notifications
```

Authentication: Required

Query parameters:

- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `read` (optional): Filter by read status (true/false)

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "New Event Near You",
      "message": "Music Festival is happening near your location on April 15, 2023.",
      "event_id": 1,
      "read": false,
      "created_at": "2023-04-01T13:30:00Z"
    },
    // More notifications...
  ]
}
```

#### Mark notification as read

```http
PUT /users/notifications/:id/read
```

Authentication: Required

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "read": true,
    "updated_at": "2023-04-02T18:45:00Z"
  }
}
```

### Categories

#### Get all categories

```http
GET /categories
```

Authentication: Optional

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name_en": "Music",
      "name_rw": "Umuziki"
    },
    {
      "id": 2,
      "name_en": "Sports",
      "name_rw": "Siporo"
    },
    {
      "id": 3,
      "name_en": "Technology",
      "name_rw": "Ikoranabuhanga"
    },
    // More categories...
  ]
}
```

## Internationalization

The API supports internationalization through the `Accept-Language` header. Set this header to specify the preferred language for responses:

```http
Accept-Language: en
```

Supported languages:

- `en` - English (default)
- `rw` - Kinyarwanda

When this header is set, appropriate fields like category names and error messages will be returned in the specified language.

## Rate Limiting

To prevent abuse, the API implements rate limiting:

- 100 requests per minute for authenticated users
- 30 requests per minute for unauthenticated users

When rate limits are exceeded, the API will return a 429 Too Many Requests response with a Retry-After header indicating when to try again.
