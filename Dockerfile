FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY wrangler.jsonc ./
ENV WATCH_DIR=/app/site WRANGLER_SEND_METRICS=false
# wrangler writes config/logs under $HOME
USER node
CMD ["node", "src/watcher.js"]
