# syntax=docker/dockerfile:1

# ---- builder ----------------------------------------------------------
# Installs every workspace's full dependency set and builds the frontend,
# then the API, which compiles clean against apps/web/dist already sitting
# on disk (nothing in the api's own build depends on the web build, but
# ordering matches "build apps/web then apps/api").
FROM node:24-alpine AS builder
WORKDIR /app

# Manifests only, so this layer caches across source-only changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

COPY . .
RUN npm run build -w apps/web
RUN npm run build -w apps/api

# ---- runtime ------------------------------------------------------------
# Production dependencies only. No source, no devDependencies, no test
# fixtures — just the compiled output, the migrations, and the built
# frontend, served by the same process on the same origin.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/web/dist ./apps/api/public

# Documentation only — Render (and `docker run -P`) map whatever PORT the
# platform actually injects; index.ts reads process.env.PORT at runtime.
EXPOSE 3000

# Never run as part of the image: seeding stays a manual one-off
# (`npm run db:seed`), never automatic on container start.
CMD ["node", "apps/api/dist/index.js"]
