## Context

Hosting today: `.github/workflows/pages.yml` has one `deploy` job that runs on every push to `main` (and manual dispatch), stamps `GAME_VERSION` in `public/js/data.js` with the short commit hash (the `Stamp game version` step, which fails the run when `grep` cannot find the stamped value), uploads `public/` with `actions/upload-pages-artifact` and publishes with `actions/deploy-pages`. The custom domain `token-not-enough.youareright.app` is set in the repository's Pages settings; Cloudflare DNS for `youareright.app` has `token-not-enough` CNAME → `fripig.github.io`, DNS only.

`tools/check/play-analytics.test.js` reads `pages.yml` and asserts that the stamp step's exact `sed` and `grep` lines exist and that `Stamp game version` comes before `upload-pages-artifact`. The `play-analytics` spec says "The GitHub Pages workflow SHALL replace it…".

`public/index.html` has a canonical link, Open Graph and Twitter URLs and JSON-LD pointing at `https://token-not-enough.youareright.app/`; `public/robots.txt` and `public/sitemap.xml` point there too.

The user owns the Cloudflare account that holds the `youareright.app` zone. Dashboard and secret changes are made by the user; the agent edits files and runs checks.

## Goals / Non-Goals

**Goals:**

- Every push to `main` publishes the same stamped `public/` to both GitHub Pages (unchanged) and the Cloudflare Pages project `token-not-enough`.
- The Cloudflare copy is reachable at `https://token-not-enough-2.youareright.app/`.
- A failure in the Cloudflare job never stops the GitHub Pages deploy.

**Non-Goals:**

- Any change to GitHub Pages, its custom domain or the `token-not-enough` DNS record.
- A link to the Cloudflare address in the game page; cache headers, service worker, Cloudflare Web Analytics, a build step, branch preview deployments.

## Decisions

### Supersedes: move the domain to Cloudflare Pages

The first version of this change moved `token-not-enough.youareright.app` to Cloudflare Pages, turned GitHub Pages into a redirect site (`.github/pages-redirect/`) and switched in three stages. The user replaced it with a separate Cloudflare copy on a different address. The redirect site, the staged switch and clearing GitHub's custom domain are dropped; no task for them was started.

### Deploy with `cloudflare/wrangler-action` as a second job

`pages.yml` keeps the existing `deploy` job unchanged (GitHub Pages) and adds a `cloudflare` job: checkout, the same `Stamp game version` step (same `sed` and `grep` lines), then `cloudflare/wrangler-action@v3` with `command: pages deploy public --project-name=token-not-enough --branch=main`, `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`. The jobs do not depend on each other, so a failing Cloudflare deploy leaves GitHub Pages deploying as before (the run is marked failed). The `cloudflare` job needs only `contents: read`; the workflow-level `pages: write` and `id-token: write` move to the `deploy` job.

Alternative: one build job that stamps once and hands an artifact to both deploy jobs. Rejected: the stamp step is two lines, and duplicating it keeps the GitHub job byte-for-byte as it is today.

Alternative: Cloudflare's Git integration. Rejected because Cloudflare would build without the stamp step.

### Project created once by hand

`wrangler pages deploy` cannot create a project non-interactively in CI, so the user creates it once (`npx wrangler pages project create token-not-enough --production-branch=main`, or a Direct Upload project in the dashboard). The API token needs only the account permission "Cloudflare Pages: Edit".

### Separate subdomain with the main address as canonical

The project's custom domain is `token-not-enough-2.youareright.app` (subdomain and name chosen by the user). Files are not rewritten for the copy: its canonical, Open Graph URLs, JSON-LD, `robots.txt` and `sitemap.xml` keep naming `token-not-enough.youareright.app`, so search engines fold the copy into the main address. Google Analytics events from both copies go to the same property; GA's page hostname tells them apart, so no new event parameter is added. `token-not-enough.pages.dev` also serves the copy; it is not advertised.

## Implementation Contract

- Workflow: one push to `main` runs the unchanged `deploy` job (GitHub Pages) and a `cloudflare` job that publishes the stamped `public/` to Cloudflare Pages project `token-not-enough` (production). Each job fails if its stamp `grep` fails; the `cloudflare` job also fails if wrangler fails. Both jobs keep `concurrency: pages`.
- Check: `node tools/check.js play-analytics` asserts that, within each of the two jobs in `pages.yml`, the exact stamp `sed` and `grep` lines appear and `Stamp game version` comes before that job's publish step (`upload-pages-artifact` in `deploy`, `cloudflare/wrangler-action` with a command containing `pages deploy public` in `cloudflare`).
- Live checks: `curl -sI https://token-not-enough-2.youareright.app/` returns 200 with `server: cloudflare`; its `js/data.js` defines `GAME_VERSION` as the deployed commit's 7-character hash, the same value served by `https://token-not-enough.youareright.app/js/data.js`; `curl -sI https://token-not-enough.youareright.app/` still shows `server: GitHub.com`.
- In scope: `.github/workflows/pages.yml`, the check, the spec wording, the `public/js/data.js` comment, `docs/DESIGN.md`, `README.md`, `README.en.md`, `CLAUDE.md`.
- Out of scope: everything in Non-Goals; any game behaviour.

## Risks / Trade-offs

- [The affected people may fail for reasons Cloudflare does not fix, such as their own network] → Give them the new address and record the answer on #59.
- [Missing or wrong secrets make the `cloudflare` job fail and mark every run red] → The GitHub job still deploys; task 1 is done before the workflow change is pushed.
- [Two copies can briefly serve different versions when one deploy is slower or fails] → Accepted; `game_version` in GA shows which build each player had.
- [Cloudflare's default caching differs from GitHub's `max-age=600`] → Accepted; not tuned in this change.

## Migration Plan

Create the project and secrets, push the workflow change, verify `token-not-enough.pages.dev`, then attach the custom domain. Rollback: delete the `cloudflare` job (and optionally the Cloudflare project and its DNS record); GitHub Pages is unaffected throughout.

## Open Questions

None.
