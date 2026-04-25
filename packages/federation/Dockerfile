FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY packages/federation/frontend/package.json ./
RUN npm install
COPY packages/federation/frontend ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/federation/package.json ./packages/federation/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/federation ./packages/federation
RUN npm run build -w @ecf/federation

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/federation/dist ./packages/federation/dist
COPY --from=backend-builder /app/packages/federation/package.json ./packages/federation/
COPY --from=frontend-builder /app/frontend/dist ./packages/federation/public

EXPOSE 3002
CMD ["node", "packages/federation/dist/index.js"]
