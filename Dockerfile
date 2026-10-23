FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm install
COPY src ./src
RUN npx tsc -p tsconfig.build.json

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY wrangler.jsonc ./
ENV WATCH_DIR=/app/site WRANGLER_SEND_METRICS=false
USER node
CMD ["node", "dist/src/watcher.js"]
