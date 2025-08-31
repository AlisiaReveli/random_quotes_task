# Random Quotes API

A quotes guessing game API where users can guess the authors of famous quotes.

## Features

- User registration and authentication
- Quote guessing game with scoring
- Top users leaderboard
- Related quotes functionality
- JWT-based authentication
- Rate limiting and cooldown protection
- **Dual API Support**: Both REST and GraphQL APIs
- Interactive GraphQL Playground

## API Documentation

This API provides both REST and GraphQL interfaces with comprehensive documentation.

### REST API (Swagger/OpenAPI)

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

### GraphQL API

**GraphQL Endpoint**: `http://localhost:3000/graphql`
**GraphQL Playground**: `http://localhost:3000/playground`

The GraphQL Playground provides:
- Interactive GraphQL query editor
- Schema exploration
- Query testing with authentication
- Example queries and mutations

### REST API Endpoints

#### Users
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get access token
- `GET /api/users/top` - Get top users by score

#### Quotes
- `GET /api/quotes/next` - Get next quote to guess
- `POST /api/quotes/guess` - Guess the author of a quote
- `GET /api/quotes/related/:quoteId` - Get related quotes

### GraphQL API

#### Queries
```graphql
# Get top users
query GetTopUsers {
  topUsers(limit: 5) {
    users {
      id
      name
      email
      score
    }
    total
  }
}

# Get next quote
query GetNextQuote {
  nextQuote(prioritize: wrong) {
    id
    content
    author
  }
}

# Get related quotes
query GetRelatedQuotes {
  relatedQuotes(quoteId: 1) {
    originalQuote {
      id
      content
      author
    }
    relatedQuotes {
      id
      content
    }
  }
}
```

#### Mutations
```graphql
# Register user
mutation RegisterUser {
  register(input: {
    email: "test@example.com"
    password: "password123"
    name: "Test User"
  }) {
    id
    email
    name
    score
  }
}

# Login
mutation LoginUser {
  login(input: {
    email: "test@example.com"
    password: "password123"
  }) {
    accessToken
    user {
      id
      email
      name
      score
    }
  }
}

# Guess author
mutation GuessAuthor {
  guessAuthor(input: {
    quoteId: 1
    authorGuess: "Albert Einstein"
  }) {
    correct
    newScore
    message
  }
}
```

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

### Testing

Run the test suite to verify both REST and GraphQL APIs:
```bash
npm test
```

Run GraphQL-specific tests:
```bash
npm test -- --testPathPattern=graphql
```

### API Comparison

| Feature | REST API | GraphQL API |
|---------|----------|-------------|
| **Endpoint** | `/api/users/*`, `/api/quotes/*` | `/graphql` |
| **Documentation** | Swagger UI (`/docs`) | GraphQL Playground (`/playground`) |
| **Authentication** | JWT Bearer Token | JWT Bearer Token |
| **Data Fetching** | Multiple requests | Single request |
| **Response Format** | Fixed structure | Requested fields only |
| **Caching** | HTTP caching | Custom caching needed |
| **Real-time** | WebSockets/SSE | Subscriptions (future) |

Both APIs share the same business logic and database, ensuring consistency across interfaces.
