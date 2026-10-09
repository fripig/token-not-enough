<!-- SPECTRA:START v1.3.0 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `docs/spectra/specs/`, change proposals in `docs/spectra/changes/`.

## Skills

Each `/spectra-*` skill carries its own trigger description; these are the groups:

- Shape and plan → `/spectra-discuss`, `/spectra-propose`
- Continue tasks for an identified change → `/spectra-apply`
- Update requirements or plans for an identified change → `/spectra-ingest`
- Quality gate → `/spectra-verify`, `/spectra-review`, `/spectra-analyze`, `/spectra-audit`, `/spectra-drift`, `/spectra-debug`
- Finish → `/spectra-archive`, `/spectra-commit`

Explicit skill invocation takes precedence. Apply existing authorization within its unchanged scope.

## Workflow

discuss? → propose → apply ⇄ ingest → verify / review → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `docs/spectra/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra-apply` and `/spectra-ingest` skills disclose parking and restore when the named operation is already explicitly requested; respect a known refusal, otherwise ask for missing authorization.

<!-- SPECTRA:END -->

## GitHub Issue 追蹤

每個 Spectra change 都在 GitHub 開一張 issue 追蹤你的執行狀態，直接用 `gh`。進度用狀態 label 表示，跟使用者的 gl-issues 側邊面板（列出指派給自己的 open issue，依狀態 label 分組）同一套：

| 狀態 label | 什麼時候換成它 |
|---|---|
| `討論中` | 剛開卡、還在 discuss／propose，或在等使用者做決定 |
| `可處理` | proposal 到 tasks 都寫完、analyze 與 validate 通過，已 park，等使用者叫 apply |
| `進行中` | apply 開始實作 |
| `檢驗中` | 任務做完，在跑 verify／review，或等使用者在本機試玩 |
| `已上線待檢驗` | 已 push 到 `main`，GitHub Pages 已部署，等使用者在線上確認 |
| `已完成` | archive 完成，同時關閉 issue |

這個專案沒有測試站與正式站之分（push 到 `main` 就上線），所以不用 `測試站待檢驗`、`正式站待檢驗`。

- 開卡：`spectra new change` 之後立刻 `gh issue create --title "[change] <name>" --label spectra --label 討論中 --assignee @me --body ...`（預設指派給使用者）。內文寫 change 名稱、目錄、一句話說明、目前階段、文件完成狀況（proposal／design／specs／tasks）、tasks.md 的勾選進度。
- 換狀態：`gh issue edit <號碼> --remove-label <舊狀態> --add-label <新狀態>`。同一張卡同時只掛一個狀態 label。
- 更新內文：每到一個階段都用 `gh issue edit <號碼> --body ...` 更新內文，並用 `gh issue comment` 留一句這次做了什麼。階段包括 proposal／design／specs／tasks 寫完、analyze 與 validate 結果、park、apply 開始、每完成一批任務、verify、commit、push。卡住時也要更新，寫明卡在哪裡。
- 找卡：`gh issue list --label spectra --state all --search "[change] <name> in:title"`。
- 收尾：archive 之後換成 `已完成`，再 `gh issue close <號碼>`。

# Token 撐到月底 專案交接

遊戲規則、數值、程式碼地圖與需求來源見下列文件：

@docs/DESIGN.md
