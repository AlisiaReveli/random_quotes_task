# Random Quotes API

A quotes guessing game API where users can guess the authors of famous quotes.

## Features

- User registration and authentication
- Quote guessing game with scoring
- Top users leaderboard
- Related quotes functionality
- JWT-based authentication
- Rate limiting and cooldown protection

## API Documentation

This API includes comprehensive Swagger/OpenAPI documentation.

### Accessing the Documentation

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/docs
   ```

The Swagger UI provides:
- Interactive API documentation
- Request/response schemas
- Authentication testing
- Example requests and responses

### API Endpoints

#### Users
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get access token
- `GET /api/users/` - Get all users (requires authentication)
- `GET /api/users/top` - Get top users by score

#### Quotes
- `GET /api/quotes/next` - Get next quote to guess
- `POST /api/quotes/guess` - Guess the author of a quote
- `GET /api/quotes/related/:quoteId` - Get related quotes

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Development

### Prerequisites
- Node.js
- npm or pnpm
- PostgreSQL database
- Redis (for caching and rate limiting)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (create `.env` file):
   ```
   DATABASE_URL="postgresql://..."
   REDIS_URL="redis://..."
   SECRET="your-jwt-secret"
   PORT=3000
   ```

3. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Testing Swagger Documentation

Run the test script to verify Swagger is working:
```bash
node test-swagger.js
```
