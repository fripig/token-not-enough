## MODIFIED Requirements

### Requirement: Translated surfaces

The following SHALL be shown in the current language: the game screen (header, quota area, ticket cards, dispatch panel, investment panel, background agent rows), every modal (setup, Monday subscription change, morning report, resume, bad save, month-end, rules), the action log lines written while that language is current, random event texts, investment, conference, hardware, client and work-content names and descriptions, ticket titles (including research tickets and their split tickets, and the conflict-resolution title prefix), and month-end titles and grades text. Ticket titles SHALL follow the current language whenever they are shown, including tickets generated before the last switch, as defined in requirement "Ticket titles follow the current language". The ticket title pools of every language SHALL hold the same number of titles in the same order for each technology line and complexity, so the same random draw picks the corresponding title.

#### Scenario: English ticket titles

- **WHEN** the current language is English and day 2 starts
- **THEN** every new ticket card shows an English title from the English pool of its technology line

#### Scenario: Same draw in both languages

- **WHEN** two runs use the same `Math.random` sequence, one in zh-TW and one in English
- **THEN** each ticket in the English run has the title at the same pool position as the zh-TW run, and every number (complexity, due day, KPI, tokens) is identical

#### Scenario: Rules modal in English

- **WHEN** the current language is English and the player opens the rules modal
- **THEN** all six tabs are in English and the numbers are the same values as in zh-TW

---
### Requirement: Already-written text keeps its language

Action log entries SHALL be stored as finished strings in the language that was current when they were written, and the stored morning report SHALL keep the text it was saved with. Switching language SHALL NOT re-translate them. A log entry written after a switch SHALL name tickets with their title in the language current at that moment. The save structure version `SAVE_VER` SHALL NOT change, and a save written in one language SHALL load in any language.

#### Scenario: Log mixed after a switch

- **WHEN** the player plays days 1–3 in zh-TW, switches to English on day 3 and ends the day
- **THEN** the log shows the day 1–3 entries in Chinese and the day 3 end-of-day summary and later entries in English

#### Scenario: New log line about an older ticket

- **WHEN** a ticket titled 跑馬燈文字錯字 was generated in zh-TW, the player switches to English and dispatches it
- **THEN** the dispatch log line names `Typo in the news ticker`, and the log lines written before the switch are unchanged

#### Scenario: Save loads across languages

- **WHEN** a save written on day 5 in zh-TW is loaded with the current language English
- **THEN** the save is accepted, the morning report is shown with its stored text, the queued tickets show English titles, and the game continues in English

## ADDED Requirements

### Requirement: Ticket titles follow the current language

Every ticket generated from a title pool SHALL remember its pool position: the technology line, the pool group (complexity 1–5, telltale trap, research or incident) and the index in that pool; a research split ticket SHALL also remember which of the two part titles it uses. Picking the position SHALL use the same random draws as picking the title string did before, so fixed-seed simulator output stays byte-identical. Wherever a ticket title is shown or written (ticket card, background agent row, dispatch panel header, log line), the title SHALL be looked up at that moment from the current language's pool at the remembered position; for a merge-conflict ticket it SHALL be the current language conflict-resolution prefix around that title. A ticket without a remembered position (a save written before this change) or whose position does not exist in the current dictionary SHALL show the title string stored when it was generated. Switching language SHALL NOT change any ticket field.

#### Scenario: Queued ticket follows a switch

- **WHEN** a ticket titled 跑馬燈文字錯字 is in the queue and the player switches to English
- **THEN** that card and the dispatch panel header show `Typo in the news ticker`, and switching back to 繁體中文 shows 跑馬燈文字錯字 again

#### Scenario: Every kind of generated ticket follows a switch

- **WHEN** tickets of each kind below were generated in zh-TW and the player switches to English
- **THEN** each shows the English title described below

##### Example: kinds of tickets

| Ticket generated in zh-TW | Shown in English |
| --- | --- |
| ordinary complexity 1–5 ticket | the English title at the same pool position |
| trap with a telltale title, before and after reveal | the English telltale title at the same position |
| incident ticket | the English incident title at the same position |
| outsourced ticket | the English title of its technology line at the same position |
| research ticket | the English research entry title |
| the two split tickets of a research ticket | the first and the second English part titles of that entry |
| merge-conflict ticket from 跑馬燈文字錯字 | `Resolve conflict: Typo in the news ticker` |

#### Scenario: Old save keeps its stored titles

- **WHEN** a save whose queued tickets have no remembered pool position, written in zh-TW, is loaded with the current language English
- **THEN** those tickets show their stored Chinese titles, including a stored merge-conflict title with its Chinese prefix, and no error is thrown

#### Scenario: Position missing from the dictionary

- **WHEN** a ticket remembers index 9 of a pool that has 6 entries in the current language
- **THEN** the ticket shows its stored title string
