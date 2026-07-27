# Multi-stage build: compile the Vite SPA, then serve the static bundle from nginx.
#
# nginx serves the SPA ONLY -- it does no API reverse-proxying (see nginx.conf, which is the source
# of truth). The browser calls both backends DIRECTLY by absolute URL (VITE_API_BASE_URL ->
# accounts, VITE_CHAT_BASE_URL -> the BFF/service), and both are CORS-enabled for this origin. The
# BFF remains the auth boundary; the browser never talks to the agent.
#
# Because those URLs are baked in at BUILD time (Vite inlines VITE_* into the bundle), a deployment
# that isn't on the default localhost ports must pass them as build args/env to `npm run build`,
# not at container start.
#
# The build stage type-checks tests/ too (`npm run build` -> `tsc -b` covers all three tsconfig
# projects), so devDependencies are needed here. None of that reaches the final image -- only
# /app/dist is copied forward.

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
