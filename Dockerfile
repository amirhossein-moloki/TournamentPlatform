# Stage 1: Build - Install dependencies and build any assets
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build-time dependencies if any (e.g., for native modules)
# RUN apk add --no-cache python3 make g++

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
# If you have native modules that need compiling, you might need to install python/make/g++
# RUN npm ci --only=production --ignore-scripts # For production builds, skip devDependencies
RUN npm ci # Install all dependencies for now, can be optimized

# Copy the rest of the application code
COPY . .

# If you have a build step (e.g., TypeScript compilation, frontend assets)
# RUN npm run build

# Stage 2: Production - Create a lean production image
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Set environment variables
# NODE_ENV is crucial for Express and other libraries to optimize for production
ENV NODE_ENV=production
# PORT will be typically set by docker-compose or orchestration platform
# ENV PORT=3000

# Install production-only dependencies (if not already handled in builder stage)
# Or copy from builder stage if using a multi-stage build properly
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Copy application code (or built artifacts from builder stage)
COPY --from=builder /usr/src/app .

# Expose the application port
# This should match the PORT environment variable your application listens on
EXPOSE ${PORT:-3000}

# Add a healthcheck (optional but recommended)
# This example checks if the server is responding on the app's port.
# Adjust the command and intervals as needed.
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#   CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-3000}/api/v1/health || exit 1
# (Note: wget might not be available in alpine by default, consider `curl` or a custom script)
# A simple Node.js based healthcheck:
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:${PORT:-3000}/api/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"


# Create a non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Ensure all files are owned by the new user
# This might need adjustment depending on what files your app needs to write to at runtime
# If logs are written to a volume, that directory might not need chown here.
RUN chown -R appuser:appgroup /usr/src/app
# RUN mkdir -p /usr/src/app/logs && chown -R appuser:appgroup /usr/src/app/logs # If logs are inside app dir

# Switch to the non-root user
USER appuser

# Command to run the application
# This should be the command that starts your Node.js server (e.g., node server.js)
CMD ["node", "server.js"]

# Notes:
# - This Dockerfile uses a multi-stage build. The `builder` stage installs all dependencies
#   (including devDependencies if `npm ci` is used without `--only=production`) and copies all code.
#   The `production` stage then copies only necessary artifacts from the `builder` stage,
#   resulting in a smaller final image.
# - For a stricter production build, use `npm ci --only=production` in the builder stage
#   if your build process doesn't require devDependencies.
# - If your application has a build step (e.g., `npm run build` for TypeScript or frontend assets),
#   uncomment and adjust the `RUN npm run build` line in the `builder` stage.
# - The `HEALTHCHECK` instruction is commented out but provides an example. You'll need a
#   health check endpoint in your application (e.g., `/api/v1/health`).
# - Running as a non-root user (`appuser`) is a security best practice.
# - Adjust `EXPOSE` if your application uses a different port.
# - The final `CMD` should point to your application's entry point (e.g., `server.js`).
# - Ensure `.dockerignore` is properly configured to avoid copying unnecessary files
#   into the Docker image.
