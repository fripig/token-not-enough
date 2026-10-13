## 1. Cloudflare account setup (user, per "Project created once by hand")

- [x] 1.1 A Cloudflare Pages project named `token-not-enough` with production branch `main` exists in the account that holds the `youareright.app` zone, created by the user with `npx wrangler pages project create token-not-enough --production-branch=main` or a Direct Upload project in the dashboard. Verify by running `npx wrangler pages project list` and seeing `token-not-enough`.
- [x] 1.2 Repository secrets `CLOUDFLARE_API_TOKEN` (account permission "Cloudflare Pages: Edit" only) and `CLOUDFLARE_ACCOUNT_ID` exist. Verify by running `gh secret list` and seeing both names. [after: 1.1]

## 2. Second deploy job (per "Deploy with `cloudflare/wrangler-action` as a second job")

- [x] 2.1 The Game version stamp check in `tools/check/play-analytics.test.js` splits `.github/workflows/pages.yml` into its `deploy` and `cloudflare` jobs and asserts, for each, that the exact stamp `sed` and `grep` lines appear and `Stamp game version` comes before that job's publish step (`upload-pages-artifact` in `deploy`; `cloudflare/wrangler-action` with a command containing `pages deploy public` in `cloudflare`). Verify by running `node tools/check.js play-analytics` before 2.2 and seeing this assertion fail on the missing `cloudflare` job.
- [x] 2.2 `.github/workflows/pages.yml` keeps the `deploy` job's steps unchanged and adds an independent `cloudflare` job (checkout, the same `Stamp game version` step, `cloudflare/wrangler-action@v3` with `command: pages deploy public --project-name=token-not-enough --branch=main`, `apiToken` and `accountId` from the two secrets); `pages: write` and `id-token: write` are granted to the `deploy` job only, `contents: read` to both; `concurrency: pages` is kept. Verify by running `node tools/check.js play-analytics` and seeing it pass, and by `git diff` showing no change inside the `deploy` job's steps. [after: 2.1]
- [x] 2.3 The comment above `GAME_VERSION` in `public/js/data.js` says both deploy jobs in `pages.yml` stamp the version. Verify by content review of the comment and `node tools/check.js localization` still passing.
- [x] 2.4 After pushing 2.2 and 2.3 to `main`, both jobs succeed; `https://token-not-enough.pages.dev/js/data.js` and `https://token-not-enough.youareright.app/js/data.js` both define `GAME_VERSION` as the pushed commit's 7-character hash, and the main address still answers with `server: GitHub.com`. Verify with `gh run watch`, `curl -s <url>/js/data.js | grep GAME_VERSION` on both addresses, and `curl -sI https://token-not-enough.youareright.app/`. [after: 1.2, 2.2, 2.3]

## 3. Custom domain (per "Separate subdomain with the main address as canonical")

- [x] 3.1 The user adds `token-not-enough-2.youareright.app` as a custom domain of the Cloudflare Pages project, which creates the DNS record `token-not-enough-2` in the `youareright.app` zone; the `token-not-enough` record is unchanged. Verify by `curl -sI https://token-not-enough-2.youareright.app/` returning 200 with `server: cloudflare`, its `js/data.js` showing the latest commit hash, its HTML containing `<link rel="canonical" href="https://token-not-enough.youareright.app/">`, and `dig +short token-not-enough.youareright.app` still returning `fripig.github.io.`. [after: 2.4]

## 4. Documentation and full check

- [x] 4.1 `docs/DESIGN.md` (the 部署 paragraph and the `GAME_VERSION` sentence naming `pages.yml`), `README.md`, `README.en.md` and the `已上線待檢驗` row in `CLAUDE.md` describe both deployments: push to `main` runs `pages.yml`, which stamps the version and deploys `public/` to GitHub Pages (`token-not-enough.youareright.app`) and to the Cloudflare Pages project `token-not-enough` (`token-not-enough-2.youareright.app`); the copy keeps the main address as canonical; GA tells them apart by hostname; the required secrets; and the reason (#59, some people could not connect) without claiming it was fixed for them. Verify by content review against `proposal.md` and `design.md`, and `grep -n "token-not-enough-2" docs/DESIGN.md README.md README.en.md CLAUDE.md` finding each file. [after: 3.1]
- [x] 4.2 The full rule check passes. Verify by running `node tools/check.js` and seeing every test pass. [after: 2.3]
- [x] 4.3 The people who reported that they could not connect are given `https://token-not-enough-2.youareright.app/`, and whether it works for them is recorded as a comment on #59 (or that no answer came yet). Verify by the comment existing on #59. [after: 3.1]

## Change note

The first version's pending tasks for the redirect site (`.github/pages-redirect/`), moving `token-not-enough.youareright.app` to Cloudflare Pages, clearing GitHub's custom domain and checking old-address redirects were cancelled, not completed; they are replaced by the decision "Supersedes: move the domain to Cloudflare Pages" in `design.md`. None of them had been started.
