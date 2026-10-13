## MODIFIED Requirements

### Requirement: Game version stamp

`public/js/data.js` SHALL define `GAME_VERSION` as `'dev'` in the repository. The deploy workflow `.github/workflows/pages.yml` publishes `public/` twice, to GitHub Pages and to Cloudflare Pages; each of its deploy jobs SHALL replace `'dev'` with the first 7 characters of the deployed commit hash before publishing `public/`, and SHALL fail when the replacement did not happen.

#### Scenario: Repository value

- **WHEN** the game modules are loaded from the repository
- **THEN** `GAME_VERSION` is `dev` and every event carries `game_version` `dev`

#### Scenario: Deploy stamp

- **WHEN** the deploy workflow runs for commit `aa66a04…`
- **THEN** the `js/data.js` published to GitHub Pages and the one published to Cloudflare Pages both define `GAME_VERSION` as `aa66a04`

#### Scenario: Stamp runs before each publish

- **WHEN** `.github/workflows/pages.yml` is read
- **THEN** in the GitHub Pages job the `Stamp game version` step appears before `upload-pages-artifact`, and in the Cloudflare job it appears before the step that runs `cloudflare/wrangler-action` with a command containing `pages deploy public`
