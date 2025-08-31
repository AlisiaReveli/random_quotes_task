# Random Quotes Game API

A fun and engaging quotes guessing game where users can test their knowledge of famous quotes and their authors. Built with Node.js, TypeScript, Fastify, and PostgreSQL.

![System Architecture](./images/alisia.drawio.png)

## 🎮 How to Play

1. **Register/Login**: Create an account or login to start playing
2. **Get a Quote**: Request a random quote from the API, you can choose if you want a difficult one or easy one.
3. **Make a Guess**: Submit your guess for the quote's author
4. **Earn Points**: Correct guesses increase your score
5. **Master Authors**: Get special rewards when you correctly guess 10+ quotes from the same author
6. **Leaderboard**: Compete with other players on the global leaderboard

## 🎯 Features

- **Quote Guessing Game**: Users can guess the authors of famous quotes
- **User Authentication**: Secure JWT-based authentication system
- **Scoring System**: Track user scores and maintain leaderboards
- **Smart Quote Selection**: Algorithm that prioritizes quotes based on difficulty
- **Cooldown System**: Prevents spam with Redis-based cooldown periods
- **Email Notifications**: Automatic discount emails when users master specific authors( <10 success guesses per author>)
- **Dual API Support**: Both REST and GraphQL endpoints
- **Real-time Quote Sync**: Automatic synchronization with external quote API
- **Comprehensive Testing**: Full test coverage with Jest
- **API Documentation**: Interactive Swagger UI documentation

## 🏗️ Architecture


- **Backend**: Node.js with TypeScript
- **Framework**: Fastify (high-performance web framework)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management and cooldowns
- **Authentication**: JWT tokens
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest with supertest
- **Containerization**: Docker with docker-compose

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v15 or higher)
- Redis (v7 or higher)
- Docker and Docker Compose (optional)

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd random_quotes_task
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

5. **Access the application**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/docs
   - GraphQL Playground: http://localhost:3000/playground

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up the database**
   ```bash
   # Start PostgreSQL and Redis locally
   # Update DATABASE_URL and REDIS_URL in .env
   ```

3. **Run database migrations**
   ```bash
   npm run test:db:setup
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Environment Configuration

Create a `.env` file based on `env.example`:

```env
# Database Configuration
DATABASE_URL="postgresql://quotes_user:quotes_password@localhost:5432/quotes_db"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# JWT Configuration
SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="1h"

# Server Configuration
PORT=3000
NODE_ENV="development"

# Email Configuration
EMAIL_THRESHOLD="3"
SMTP_URL="smtp://localhost:587"
SMTP_FROM="no-reply@quotesgame.com"

# Cooldown Configuration
COOLDOWN_TIME="43200"

# Logging
LOG_LEVEL="info"
```

## 📚 API Endpoints

### REST API

#### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/top` - Get top users leaderboard

#### Quotes
- `GET /api/quotes/next` - Get next quote to guess
- `POST /api/quotes/guess` - Submit author guess
- `GET /api/quotes/:id/related` - Get related quotes by same author

### GraphQL API

Access the GraphQL playground at `/graphql` for interactive queries and mutations.

#### Queries
```graphql
query {
  topUsers(limit: 10) {
    users {
      id
      name
      score
    }
    total
  }
  
  nextQuote(prioritize: wrong) {
    id
    content
  }
  
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
mutation {
  register(input: {
    email: "user@example.com"
    password: "password123"
    name: "John Doe"
  }) {
    id
    email
    name
    score
  }
  
  login(input: {
    email: "user@example.com"
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


## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Reset test database
npm run test:db:reset
```

## 🏗️ Development

### Project Structure

```
src/
├── app.ts                 # Main application entry point
├── modules/               # Feature modules
│   ├── quotes/           # Quote-related functionality
│   └── user/             # User management
├── services/             # Business logic services
├── guards/               # Authentication and authorization
├── jobs/                 # Background jobs and schedulers
├── graphql/              # GraphQL schema and resolvers
├── utils/                # Utility functions
└── tests/                # Test files
```

### Key Features Explained

- **Smart Quote Selection**: The system prioritizes quotes based on difficulty to guess
- **Cooldown System**: Prevents users from making multiple guesses too quickly
- **Email Integration**: Sends discount emails when users master specific authors
- **Quote Synchronization**: Automatically syncs with external quote APIs
- **Comprehensive Logging**: Structured logging with different log levels

## 🚀 Deployment

### Using the provided deployment script:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual deployment:

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set up production environment**
   ```bash
   # Configure production environment variables
   # Set up PostgreSQL and Redis instances
   ```

3. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 📊 Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: User accounts with authentication and scoring
- **Quotes**: Quote content with author information and statistics
- **UserQuoteAttempts**: Track user attempts and performance

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Zod schemas
- Rate limiting and cooldown mechanisms
- CORS protection
- Environment-based configuration

## 📈 Monitoring and Logging

- Structured logging with Pino
- Health check endpoint (`/healthcheck`)
- Request/response logging
- Error tracking and reporting




**Happy Quote Guessing! 🎯**