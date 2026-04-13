# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/prix-a-la-pompe/browser /usr/share/nginx/html

# Copy the config template — envsubst replaces ${BACKEND_URL} at container start
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1
