import { FastifyInstance } from 'fastify'
import { execute, parse, validate } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { createGraphQLContext } from './context'

export async function setupGraphQL(app: FastifyInstance) {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  })

  app.register(async function (fastify) {
    fastify.route({
      method: ['GET', 'POST'],
      url: '/graphql',
      handler: async (request, reply) => {
        const { query, variables, operationName } = request.method === 'GET' 
          ? request.query as any
          : request.body as any

        if (!query) {
          return reply.code(400).send({
            errors: [{ message: 'Query is required' }]
          })
        }

        try {
          const context = await createGraphQLContext(request, reply)

          const document = parse(query)
          const validationErrors = validate(schema, document)
          
          if (validationErrors.length > 0) {
            return reply.code(400).send({
              errors: validationErrors
            })
          }

          const result = await execute({
            schema,
            document,
            variableValues: variables,
            operationName,
            contextValue: context
          })

          reply.send(result)
        } catch (error: any) {
          reply.code(500).send({
            errors: [{ message: error.message }]
          })
        }
      }
    })

    fastify.get('/playground', async (request, reply) => {
      const playgroundHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>GraphQL Playground</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
            <link rel="shortcut icon" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
            <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
          </head>
          <body>
            <div id="root">
              <style>
                body {
                  background-color: rgb(23, 42, 58);
                  font-family: Open Sans, sans-serif;
                  height: 90vh;
                }
                #root {
                  height: 100vh;
                  width: 100vw;
                }
                .playgroundIn {
                  font-family: 'Open Sans', sans-serif;
                  font-size: 14px;
                  font-weight: normal;
                  color: rgb(38, 139, 210);
                  text-decoration: none;
                }
              </style>
              <div class="playgroundIn">
                <div style="text-align: center; margin-top: 50px;">
                  <h1 style="color: white;">GraphQL Playground</h1>
                  <p style="color: white;">Quotes Game API</p>
                  <div style="margin-top: 30px;">
                    <a href="/graphql" style="color: #26a69a; text-decoration: none; font-size: 16px;">
                      → GraphQL Endpoint: /graphql
                    </a>
                  </div>
                  <div style="margin-top: 20px;">
                    <a href="/docs" style="color: #26a69a; text-decoration: none; font-size: 16px;">
                      → REST API Docs: /docs
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <script>
              window.addEventListener('load', function (event) {
                GraphQLPlayground.init(document.getElementById('root'), {
                  endpoint: '/graphql',
                  settings: {
                    'request.credentials': 'include',
                  },
                  tabs: [
                    {
                      endpoint: '/graphql',
                      query: \`# Welcome to Quotes Game GraphQL API
# 
# Try these example queries:

# 1. Register a new user
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

# 2. Login
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

# 3. Get top users (requires authentication)
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

# 4. Get next quote (requires authentication)
query GetNextQuote {
  nextQuote(prioritize: wrong) {
    id
    content
  }
}

# 5. Guess author (requires authentication)
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

# 6. Get related quotes (requires authentication)
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
}\`
                    }
                  ]
                })
              })
            </script>
          </body>
        </html>
      `
      
      reply.type('text/html').send(playgroundHTML)
    })
  })

  app.log.info('GraphQL server setup complete')
  app.log.info('GraphQL endpoint: http://localhost:3000/graphql')
  app.log.info('GraphQL Playground: http://localhost:3000/playground')
}
