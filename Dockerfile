FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm install
COPY src ./src
RUN npx tsc -p tsconfig.build.json

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY wrangler.jsonc ./
ENV WATCH_DIR=/app/site WRANGLER_SEND_METRICS=false
RUN mkdir .wrangler
RUN chown -R node:node .wrangler
USER node
CMD ["node", "dist/src/watcher.js"]
