# Instructions for any AI assistant working in this repo

Read these, in order, BEFORE doing anything else:
1. `AI_CONTEXT.md`   – what this project is, stack, conventions, hard rules
2. `docs/PLAN.md`    – the phased plan and current status (checkboxes)
3. `docs/AI_LOG.md`  – newest entries at the bottom; tells you where the last session stopped
4. `docs/DECISIONS.md` and `docs/OPEN_QUESTIONS.md` as needed
5. `docs/LOCAL_SETUP.md`  – the user's device (Termux), accounts and push workflow; never re-ask what is recorded there

Before you finish ANY session:
- Append an entry to `docs/AI_LOG.md` (template at top of that file)
- Tick/untick boxes in `docs/PLAN.md`
- Record new decisions in `docs/DECISIONS.md`, new blockers in `docs/OPEN_QUESTIONS.md`
- Update `docs/LOCAL_SETUP.md` when the user tells you anything about their environment (replace the `?`, add a change-log line)
- Update `AI_CONTEXT.md` only if a fact there became wrong

Never ask the user to re-explain anything that is written in these files.
Never put secrets (service-role key, passwords) in the repo or in the logs.
