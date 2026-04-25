FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY packages/community/frontend/package.json ./
RUN npm install
COPY packages/community/frontend ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/community/package.json ./packages/community/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/community ./packages/community
RUN npm run build -w @ecf/community

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/community/dist ./packages/community/dist
COPY --from=backend-builder /app/packages/community/package.json ./packages/community/
COPY --from=frontend-builder /app/frontend/dist ./packages/community/public

EXPOSE 3000
CMD ["node", "packages/community/dist/index.js"]
