## MODIFIED Requirements

### Requirement: Ticket titles follow the current language

Every ticket generated from a title pool SHALL remember its pool position: the technology line, the pool group (complexity 1–6, telltale trap, research or incident) and the index in that pool; a research split ticket SHALL also remember which of the two part titles it uses. Picking the position SHALL use the same random draws as picking the title string did before, so fixed-seed simulator output stays byte-identical; a ticket turned into complexity 6 SHALL keep its drawn index modulo the length of the complexity-6 pool, with no extra draw. Wherever a ticket title is shown or written (ticket card, background agent row, dispatch panel header, log line), the title SHALL be looked up at that moment from the current language's pool at the remembered position; for a merge-conflict ticket it SHALL be the current language conflict-resolution prefix around that title. A ticket without a remembered position (a save written before this change) or whose position does not exist in the current dictionary SHALL show the title string stored when it was generated. Switching language SHALL NOT change any ticket field.

#### Scenario: Queued ticket follows a switch

- **WHEN** a ticket titled 跑馬燈文字錯字 is in the queue and the player switches to English
- **THEN** that card and the dispatch panel header show `Typo in the news ticker`, and switching back to 繁體中文 shows 跑馬燈文字錯字 again

#### Scenario: Every kind of generated ticket follows a switch

- **WHEN** tickets of each kind below were generated in zh-TW and the player switches to English
- **THEN** each shows the English title described below

##### Example: kinds of tickets

| Ticket generated in zh-TW | Shown in English |
| --- | --- |
| ordinary complexity 1–6 ticket | the English title at the same pool position |
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
