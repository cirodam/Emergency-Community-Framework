FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY packages/market/frontend/package.json ./
RUN npm install
COPY packages/market/frontend ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/market/package.json ./packages/market/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/market ./packages/market
RUN npm run build -w @ecf/market

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/market/dist ./packages/market/dist
COPY --from=backend-builder /app/packages/market/package.json ./packages/market/
COPY --from=frontend-builder /app/frontend/dist ./packages/market/public

EXPOSE 3003
CMD ["node", "packages/market/dist/index.js"]
