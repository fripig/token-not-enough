## Summary

Publish a second copy of the site on Cloudflare Pages at its own address, `https://token-not-enough-2.youareright.app/`, from the same push to `main` and with the same `GAME_VERSION` stamp. GitHub Pages and `https://token-not-enough.youareright.app/` stay exactly as they are.

## Motivation

Issue #59: the user reports that some people cannot connect to the site. From the development machine on 2026-10-13 (measured) the site answered 8 of 8 requests with 200, connect about 0.05 s and total 0.14–0.37 s, served by GitHub's Fastly node in Tokyo, so the failure was not reproduced there. The domain resolves to GitHub's four shared Pages addresses 185.199.108–111.153.

The first version of this change moved the domain to Cloudflare Pages. The user replaced that with a separate Cloudflare Pages copy on a different address (supersedes the "move the domain" decision), and picked a `youareright.app` subdomain over the bare `token-not-enough.pages.dev` address. The user named the subdomain `token-not-enough-2`.

Whether the copy works for the affected people cannot be measured from here (estimate: it helps if their networks block or route badly to GitHub's Pages addresses). The done criterion includes giving them the new address and recording whether it worked.

## Proposed Solution

- `.github/workflows/pages.yml` keeps its GitHub Pages job unchanged and gains a `cloudflare` job that runs the same `Stamp game version` step and publishes `public/` to a Cloudflare Pages project `token-not-enough` with `cloudflare/wrangler-action` (production branch `main`), using repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- The Cloudflare Pages project gets the custom domain `token-not-enough-2.youareright.app` (a new DNS record in the same zone). The existing `token-not-enough` record is not touched.
- The copy is byte-identical to the GitHub build: canonical link, Open Graph URLs, JSON-LD, `robots.txt` and `sitemap.xml` keep pointing at `token-not-enough.youareright.app`, so search engines treat the copy as a duplicate of the main address.
- Google Analytics uses the same property; the two copies are told apart by the page hostname GA already records.
- The `play-analytics` requirement "Game version stamp" says both deploy jobs stamp the version before publishing; `tools/check/play-analytics.test.js` checks that order for both.
- `docs/DESIGN.md`, `README.md`, `README.en.md` and `CLAUDE.md` (the `已上線待檢驗` status row) describe the two deployments.

## Non-Goals

- No change to GitHub Pages, its custom domain, or the `token-not-enough` DNS record.
- No link to the Cloudflare address inside the game page or footer.
- No custom cache headers (`_headers`), service worker, Cloudflare Web Analytics, or build step.
- No change to game code other than the comment in `public/js/data.js` that names the deploy workflow.

## Alternatives Considered

- Move the main domain to Cloudflare Pages and turn GitHub Pages into a redirect (this change's first version): superseded by the user's request for a separate copy on a different address.
- Use only `token-not-enough.pages.dev`: no DNS work, but the user chose a `youareright.app` subdomain.
- Turn on Cloudflare's proxy in front of GitHub Pages: not chosen by the user.

## Impact

- Affected specs: `play-analytics` (Requirement: Game version stamp)
- Affected code:
  - Modified: .github/workflows/pages.yml, tools/check/play-analytics.test.js, public/js/data.js, docs/DESIGN.md, README.md, README.en.md, CLAUDE.md
  - New: none
  - Removed: none
- External systems: a new Cloudflare Pages project and API token, two GitHub repository secrets, and a new DNS record `token-not-enough-2` in the `youareright.app` zone created by attaching the custom domain. These are changed by the user in the Cloudflare and GitHub dashboards or with `wrangler`; the tasks name each one.
