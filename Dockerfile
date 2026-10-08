# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install since we have bun.lock but no package-lock.json)
RUN npm install

# Copy source code
COPY . .

# Build the app (frontend + server bundle)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# System chromium for the news scraper / image fetcher (playwright-core drives it)
RUN apk add --no-cache chromium
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy any other necessary files
COPY --from=builder /app/server.ts ./server.ts

EXPOSE 3000

# Start the server
CMD ["node", "dist/server.cjs"]