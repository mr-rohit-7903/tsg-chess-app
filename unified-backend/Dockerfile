FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src ./src

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "src/index.js"]
