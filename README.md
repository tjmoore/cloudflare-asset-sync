# Cloudflare Asset Sync

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node.js-24-green.svg)](https://nodejs.org/)\
[![Build](https://github.com/tjmoore/cloudflare-asset-sync/actions/workflows/build.yml/badge.svg)](https://github.com/tjmoore/cloudflare-asset-sync/actions/workflows/build.yml)
[![Issues](https://img.shields.io/github/issues/tjmoore/cloudflare-asset-sync.svg)](https://github.com/tjmoore/cloudflare-asset-sync/issues)
[![Release](https://img.shields.io/github/v/release/tjmoore/cloudflare-asset-sync.svg)](https://github.com/tjmoore/cloudflare-asset-sync/releases)

A tool to automatically deploy static assets to a Cloudflare Worker when changes are detected in a specified folder.

This will create a Cloudflare Worker with the name specified in wrangler.jsonc or update an existing one if it already exists.

Watches a folder of files and, once changes have been quiet for `DEBOUNCE_MS`, runs `wrangler deploy` to publish them to a Cloudflare Worker. Before each deploy, a `sitemap.xml` listing the site's `.html` files is generated in `WATCH_DIR` using `SITE_URL` as the base URL (skipped if `SITE_URL` is unset).

Deployable as a container or run via Node.js directly.

## Setup
1. Edit `wrangler.jsonc` (worker `name`, `assets.directory` = watched folder).
2. If using a container, configure the volume mount for the watched folder (e.g., `./site` at `/app/site`), see docker-compose.yml.
3. `cp .env.example .env` and set `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` (token needs Workers edit permission).
4. `npm install && npm run build && npm start` to run locally,
5. or for container build `docker compose up -d --build`.

## Behaviour
- Every add/change/delete restarts the debounce timer, so bulk changes become one deploy.
- Only one deploy runs at a time; changes during a deploy trigger one follow-up deploy.
- Failed deploys retry (`MAX_RETRIES`, linear backoff via `RETRY_DELAY_MS`).
- Deploys on startup unless `DEPLOY_ON_START=false`. SIGTERM waits for an in-flight deploy.
- Use `USE_POLLING=true` for bind mounts / network shares.
- Dotfiles and `*~`, `*.swp`, `*.tmp` are ignored.

## Tests
`npm test`

## Notes

/site is an example site folder that is being watched for changes.

Dependencies:
- [Node.js](https://nodejs.org/) - Node 24 or greater
- [Chokidar](https://github.com/paulmillr/chokidar) - File watcher for Node.js
- [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler/) - Cloudflare Workers CLI tool

Dev Dependencies:
- [TypeScript](https://www.typescriptlang.org/)
- [@types/node](https://www.npmjs.com/package/@types/node)

Initial template co-authored by GitHub Copilot.