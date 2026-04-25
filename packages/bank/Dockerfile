FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY packages/bank/frontend/package.json ./
RUN npm install
COPY packages/bank/frontend ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/bank/package.json ./packages/bank/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/bank ./packages/bank
RUN npm run build -w @ecf/bank

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/bank/dist ./packages/bank/dist
COPY --from=backend-builder /app/packages/bank/package.json ./packages/bank/
COPY --from=frontend-builder /app/frontend/dist ./packages/bank/public

EXPOSE 3001
CMD ["node", "packages/bank/dist/index.js"]
