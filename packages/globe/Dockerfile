FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/globe/package.json ./packages/globe/
RUN npm install --workspace=packages/core --workspace=packages/globe
COPY packages/core ./packages/core
COPY packages/globe ./packages/globe
RUN npm run build --workspace=packages/core
RUN npm run build --workspace=packages/globe
WORKDIR /app/packages/globe
CMD ["node", "dist/index.js"]
