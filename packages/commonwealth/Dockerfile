FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/commonwealth/package.json ./packages/commonwealth/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/commonwealth ./packages/commonwealth
RUN npm run build -w @ecf/commonwealth

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/commonwealth/dist ./packages/commonwealth/dist
COPY --from=backend-builder /app/packages/commonwealth/package.json ./packages/commonwealth/

EXPOSE 3020
CMD ["node", "packages/commonwealth/dist/index.js"]
