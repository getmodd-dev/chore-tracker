FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (supports with or without package-lock.json)
COPY package*.json ./
RUN npm install

# Copy source code and build app
COPY . .
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built distribution files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create persistent storage folder for Unraid appdata
RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
