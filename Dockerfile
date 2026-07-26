# Multi-stage build: compile the Vite SPA, then serve it from nginx which also reverse-proxies the
# two backends so the browser only ever sees one same-origin (no CORS, no ports in the browser):
#   /api/accounts/* -> accounts service     /api/chat/* -> BFF/service (SSE)
# Upstream hostnames `accounts` and `service` resolve in both docker-compose and k8s (Services are
# named identically there).

# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
