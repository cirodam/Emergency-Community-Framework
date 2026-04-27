FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY packages/mail/frontend/package.json ./
RUN npm install
COPY packages/mail/frontend ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/mail/package.json ./packages/mail/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/mail ./packages/mail
RUN npm run build -w @ecf/mail

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/mail/dist ./packages/mail/dist
COPY --from=backend-builder /app/packages/mail/package.json ./packages/mail/
COPY --from=frontend-builder /app/frontend/dist ./packages/mail/public

EXPOSE 3020
CMD ["node", "packages/mail/dist/index.js"]
