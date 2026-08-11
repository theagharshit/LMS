# syntax=docker/dockerfile:1.7
FROM node:22-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/backend/prisma.config.ts apps/backend/prisma.config.ts
COPY apps/backend/prisma apps/backend/prisma
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
RUN npm exec -w lms-backend -- prisma generate

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:22-slim AS backend-runtime
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --chown=node:node --from=build /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
COPY --chown=node:node --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --chown=node:node --from=build /app/apps/backend/scripts ./apps/backend/scripts
COPY --chown=node:node --from=build /app/package.json ./package.json
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "apps/backend/scripts/healthcheck.mjs"]
CMD ["sh", "-c", "cd apps/backend && ../../node_modules/.bin/prisma migrate deploy && node dist/server.cjs"]

FROM node:22-slim AS frontend-runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/apps/frontend ./apps/frontend
USER node
EXPOSE 4173
WORKDIR /app/apps/frontend
CMD ["../../node_modules/.bin/vite", "preview", "--host", "0.0.0.0"]

