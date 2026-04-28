FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/globe/package.json ./packages/globe/

RUN npm install

COPY packages/core ./packages/core
RUN npm run build -w @ecf/core

COPY packages/globe ./packages/globe
RUN npm run build -w @ecf/globe

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./packages/core/dist
COPY --from=backend-builder /app/packages/core/package.json ./packages/core/
COPY --from=backend-builder /app/packages/globe/dist ./packages/globe/dist
COPY --from=backend-builder /app/packages/globe/package.json ./packages/globe/

EXPOSE 3030
CMD ["node", "packages/globe/dist/index.js"]
