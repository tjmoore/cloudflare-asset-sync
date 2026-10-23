# Static site deploy watcher

Watches a folder of static files and, once changes have been quiet for `DEBOUNCE_MS`, runs `wrangler deploy` to publish them to a Cloudflare Worker (static assets).

## Setup
1. Edit `wrangler.jsonc` (worker `name`, `assets.directory` = watched folder).
2. `cp .env.example .env` and set `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` (token needs Workers edit permission).
3. `npm install && npm start`, or `docker compose up -d --build` (mounts `./site` at `/app/site`).

## Behaviour
- Every add/change/delete restarts the debounce timer, so bulk changes become one deploy.
- Only one deploy runs at a time; changes during a deploy trigger one follow-up deploy.
- Failed deploys retry (`MAX_RETRIES`, linear backoff via `RETRY_DELAY_MS`).
- Deploys on startup unless `DEPLOY_ON_START=false`. SIGTERM waits for an in-flight deploy.
- Use `USE_POLLING=true` for bind mounts / network shares.
- Dotfiles and `*~`, `*.swp`, `*.tmp` are ignored.

## Tests
`npm test`
