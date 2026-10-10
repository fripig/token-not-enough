## ADDED Requirements

### Requirement: Dispatch panel decision first

With a ticket selected, the dispatch panel SHALL show, from top to bottom: the ticket title; the load-preset buttons; the estimate (tokens, cost or quota, success rate, hours); the stack, investment and parallel hints; the warning line; the action buttons (dispatch, manual work, research, evaluation, rescope); then the fine-tuning sections (agent and model, billing, review, reasoning effort in 進階 mode, SDD when owned); and last the save-preset buttons. Changing any fine-tuning choice SHALL update the estimate, warning and action buttons at the top.

#### Scenario: Order with a ticket selected

- **WHEN** a ticket is selected
- **THEN** in the dispatch panel the 載入方案 buttons come before the estimate, the estimate before the dispatch button, the dispatch button before the agent and model grid, and the grid before the 存成方案 buttons

#### Scenario: Fine-tuning updates the top

- **WHEN** the player picks Gemini Pro in the model grid below the dispatch button
- **THEN** the estimate and the dispatch button label at the top reflect Gemini Pro and Gemini CLI
