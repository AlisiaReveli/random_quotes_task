# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install OpenSSL and curl for health checks
RUN apk add --no-cache openssl curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm ci --only=production && npm cache clean --force

# Expose port
EXPOSE 3000

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthcheck || exit 1

# Start the application (will run migrations automatically)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
