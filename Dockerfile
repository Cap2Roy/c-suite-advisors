FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy application code
COPY . .

# Create data directory with proper ownership for the node user
RUN mkdir -p data && chown -R node:node /app/data

# Expose port (Cloud Run sets PORT env var)
ENV PORT=8080
EXPOSE 8080

# Use non-root user for security
USER node

# Start the application
CMD ["node", "src/index.js"]
