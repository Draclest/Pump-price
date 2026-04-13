# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
# nginx:1.27-alpine — stable, patched, minimal attack surface
FROM nginx:1.27-alpine

COPY --from=builder /app/dist/prix-a-la-pompe/browser /usr/share/nginx/html

# Copy the config template.
# The nginx image entrypoint runs envsubst over files in /etc/nginx/templates/
# and writes results to /etc/nginx/conf.d/.
# Only ${BACKEND_URL} is substituted — Nginx variables ($host, $remote_addr…)
# are left untouched because they are not shell environment variables.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1
