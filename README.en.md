# Token Not Enough

[繁體中文](README.md) | English

Play online: https://token-not-enough.youareright.app/

A 20-working-day management game. You are an engineer who picks one or two work roles at the start (Laravel backend, Rails backend, Rust infrastructure, App development, SRE, DevOps). New tickets come in every day, and you decide which code agent to send each one to, which model it uses, and who pays for the tokens: a personal subscription, personal API, company API, a company team seat, or a local GPU.

> Prices, quotas and model abilities are made-up numbers for game balance. They do not reflect any vendor's real plans.

The interface is available in Traditional Chinese and English. The game picks one from your browser language the first time, and you can switch any time from the header.

## How it plays

- **Work roles and stacks**: most tickets come from the stacks you picked, plus front-end work and a few tickets from other stacks. Writing code yourself on an unfamiliar stack takes twice as long. Rust compiles slowly and weaker models get stuck on the borrow checker; App work runs on simulators and some tickets must pass store review; Laravel and Rails have strong conventions, so a cheap model handles simple tickets; SRE gets more incidents; DevOps waits on CI and terraform. Role buttons show a difficulty rating.
- **Vendors**: Claude Code, Codex CLI, Gemini CLI, DeepSeek, Zhipu GLM, Kimi, and self-hosted open-weight models.
- **Billing**: personal subscriptions have daily and weekly quotas; personal API is pay-as-you-go; company API only covers vendors the company has a contract with.
- **Game modes**: parallel mode (pick 2–6 background agents at the start; the more run at once, the longer PR review takes and the higher the chance of merge conflicts) and single-lane mode.
- **Client restrictions**: financial clients forbid Chinese cloud models, and government contracts forbid even Chinese open weights.
- **Trap tickets**: some "five-minute" tickets actually touch the whole architecture. You can spend tokens to have an agent evaluate the architecture first; if you step on one, you can ask your manager to re-scope it for a fair KPI and deadline.
- **Self-review**: spend more tokens and time for a chance to catch a broken change on the spot instead of redoing the whole ticket.
- **Month-end score**: an S–D grade based on KPI, manager trust and audit count. Money doesn't count toward the score; it is only a resource, and how you spent it decides your title.

## Run locally

It is a plain static site with no build step. The game loads as native ES modules, and browsers refuse to load modules from `file://`, so serve it locally instead of double-clicking `index.html`:

```sh
npx serve public
# or
python3 -m http.server -d public 8000
```

## Rule checks and balance simulation

```sh
node tools/check.js   # asserts every example number in the specs (node:test runs one file per spec under tools/check/)
node tools/check.js save-game   # check a single spec
node tools/sim.js     # 2 modes × 6 work roles × 3 review levels, 100 months each (SIM_N to change, SIM_TRAP=0 disables trap tickets, SIM_SLOTS=2..6 sets the slot count, SIM_SEED=<integer> makes output reproducible)
```

Run both after changing numbers to make sure nothing breaks and no work role is clearly out of balance. The tool output is in Chinese.

## Adding a language

All game text lives in the dictionaries under `public/js/i18n/`, keyed by English ids. To add a language (say Japanese, `ja`):

1. Copy `public/js/i18n/en.js` to `public/js/i18n/ja.js` and translate the values only. Keep every key, keep the length and order of each `pool.*` ticket-title array, keep `{name}` placeholders, and write `lang.name` in the language itself (e.g. `日本語`).
2. Register it in `LANGS` in `public/js/i18n.js`: `import {DICT as ja} from './i18n/ja.js';` and `{id:'ja',dict:ja}`.
3. Add a footer block `<div data-lang="ja" lang="ja" hidden>…</div>` inside `<footer id="about">` in `public/index.html`.
4. Run `node tools/check.js`; it fails on missing keys or pool arrays of a different length.

## Deployment

Pushing to `main` runs `.github/workflows/pages.yml`, which deploys `public/` to GitHub Pages.
The first time, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** in the repo.

## Project layout

```
public/
  index.html     # page skeleton
  css/style.css  # styles (with dark mode)
  js/main.js     # entry: event delegation, game start
  js/data.js     # vendors, clients, stacks, plans, investments and helpers
  js/state.js    # game state and ticket generation
  js/calc.js     # success rate, billing, quota calculations
  js/actions.js  # dispatch, settlement, evaluation, investments, daily events
  js/view.js     # screen rendering
  js/modals.js   # setup, daily and month-end dialogs
  js/rules.js    # rules dialog
  js/i18n.js     # localization: language registry, t(), language switch
  js/i18n/*.js   # dictionaries (zh-TW default, en)
tools/sim.js     # balance simulator
tools/check.js   # rule check entry point
tools/check/     # rule checks, one <spec>.test.js per spec, plus the shared lib.js
tools/fake-dom.js # fake DOM shared by the tools
tools/seed.js    # seeded random (shared by SIM_SEED and CHECK_SEED)
docs/DESIGN.md   # design and handover notes, in Chinese (requirements, rules and numbers, balance logs, code map)
.github/workflows/pages.yml
```
