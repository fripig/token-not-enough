## MODIFIED Requirements

### Requirement: Research log lines

A completed agent research SHALL log ✂ <title>｜研究｜<agent> / <model>・<billing>｜拆成「<part 1>」（複雜度 N）＋「<part 2>」（複雜度 N）｜<tokens> tokens｜<spend>｜<hours>h. A completed self research SHALL log ✂ <title>｜自己研究｜拆成「<part 1>」（複雜度 N）＋「<part 2>」（複雜度 N）｜<hours>h. An agent research stopped by quota SHALL log ✗ <title>｜研究｜<agent> / <model>・<billing>｜額度不夠，研究沒做完｜<spend>. In each of these lines, when the researched ticket is sensitive, <title> SHALL be written as `<title>（機敏）` (English: `<title> (sensitive)`); the part titles SHALL NOT carry the tag.

#### Scenario: Self research log

- **WHEN** the player self-researches a complexity-5 Laravel research ticket
- **THEN** the newest log line starts with ✂, contains 自己研究 and 拆成, and names both part titles with 複雜度 3

#### Scenario: Agent research of a sensitive ticket

- **WHEN** the player researches a sensitive research ticket with Claude Code / Opus on 個人訂閱 and the audit roll catches it
- **THEN** the research line contains `（機敏）｜研究｜Claude Code / Opus・個人訂閱`, and the audit line logged after it names the same ticket title and `Claude Code / Opus・個人訂閱`
