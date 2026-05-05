FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY packages/atheneum/frontend/package.json ./
RUN npm install
COPY packages/atheneum/frontend ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/atheneum/package.json ./packages/atheneum/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/atheneum ./packages/atheneum
RUN npm run build -w @ecf/atheneum

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/atheneum/dist ./packages/atheneum/dist
COPY --from=backend-builder /app/packages/atheneum/package.json ./packages/atheneum/
COPY --from=frontend-builder /app/frontend/dist ./packages/atheneum/public

EXPOSE 3004
CMD ["node", "packages/atheneum/dist/index.js"]
