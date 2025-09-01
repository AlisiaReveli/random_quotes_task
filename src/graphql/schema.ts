export const typeDefs = `
  # User Types
  type User {
    id: ID!
    email: String!
    name: String
    score: Int!
  }

  type AuthPayload {
    accessToken: String!
    user: User!
  }

  type TopUsersResponse {
    users: [User!]!
    total: Int!
  }

  # Quote Types
  type Quote {
    id: ID!
    content: String!
    author: String
  }

  type GuessResult {
    correct: Boolean!
    newScore: Int
    message: String!
  }

  type RelatedQuotesResponse {
    originalQuote: Quote!
    relatedQuotes: [Quote!]!
  }

  # Input Types
  input CreateUserInput {
    email: String!
    password: String!
    name: String
  }

  input LoginUserInput {
    email: String!
    password: String!
  }

  input GuessInput {
    quoteId: Int!
    authorGuess: String!
  }

  input NextQuoteQuery {
    prioritize: Prioritize
  }

  enum Prioritize {
    correct
    wrong
  }

  # Root Types
  type Query {
    # User queries
    topUsers(limit: Int): TopUsersResponse!
    
    # Quote queries
    nextQuote(prioritize: Prioritize): Quote!
    relatedQuotes(quoteId: Int!): RelatedQuotesResponse!
  }

  type Mutation {
    # User mutations
    register(input: CreateUserInput!): User!
    login(input: LoginUserInput!): AuthPayload!
    
    # Quote mutations
    guessAuthor(input: GuessInput!): GuessResult!
  }

  # Custom scalar for JSON
  scalar JSON
`
