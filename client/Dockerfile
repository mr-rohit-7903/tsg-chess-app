# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL

RUN npm run build

# Production serve stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Default nginx config is fine for simple static file serving, 
# but for SPA routing (react router), we need a custom one.
# We will create a small one on the fly or copy one.
# For simplicity in this 'no-exposed-nginx-conf' setup, 
# let's write a simple config via echo or assume root index.
# Better: copy the nginx.conf for SPA support.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
