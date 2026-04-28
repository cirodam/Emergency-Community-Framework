FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/commonwealth/package.json ./packages/commonwealth/
RUN npm install --workspace=packages/core --workspace=packages/commonwealth
COPY packages/core ./packages/core
COPY packages/commonwealth ./packages/commonwealth
RUN npm run build --workspace=packages/core
RUN npm run build --workspace=packages/commonwealth
WORKDIR /app/packages/commonwealth
CMD ["node", "dist/index.js"]
