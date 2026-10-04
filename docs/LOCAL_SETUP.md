# Local setup log (the human's machine) – READ BEFORE ASKING THE USER ANYTHING ABOUT THEIR ENVIRONMENT

Purpose: remember the user's device/accounts/settings so no AI session asks again.
**Never write passwords, tokens, service-role keys or OAuth secrets here.** Anything marked `?` is unknown:
ask ONCE, then replace the `?` and add a line to the change log at the bottom.

## Standing preferences (from the user – obey without asking)
- **No testing on the user's device.** Do not ask them to run `npm install`, `npm run dev`, local Supabase, pgTAP or any other local test. They test directly on production (deployed site + real Supabase project). Verification = GitHub Actions CI + the production site. AI sessions still run whatever checks they can in their own sandbox (e.g. `tools/local-db-test/run.sh`).
- Give Termux commands as ONE short command or script at a time. Long pasted multi-line blocks get swallowed by interactive prompts (this already happened once during setup.sh).

## Facts
| Item | Value |
|---|---|
| Device / OS | Android phone, Termux (exact device/Android version: ?) |
| Git name | harsha-maloth (use the real full name instead if preferred: ?) |
| Git email | 232861054+harsha-maloth@users.noreply.github.com (GitHub no-reply address; keeps the real email out of commits) |
| GitHub username | harsha-maloth |
| GitHub repo | https://github.com/iist-oss/iist-qps (owned by the org `iist-oss`; PUBLIC – so never commit secrets; takedown policy Q6 matters more) |
| Pages URL (expected) | https://iist-oss.github.io/iist-qps/ (use for Supabase Site URL / redirect URLs, USER_ACTIONS 13) |
| University | probably IIST (inferred from the org name `iist-oss`; NOT confirmed – see OPEN_QUESTIONS Q1) |
| GitHub auth method | `gh auth login` HTTPS + web browser – DONE 2026-10-04, logged in as harsha-maloth, token scopes gist/read:org/repo/workflow (so Actions workflows can be pushed) |
| Termux packages installed | git 2.54, gh 2.95, openssh, unzip, zip, nodejs-lts 24 / npm 11 (node not needed for the current workflow) |
| Repo zip location | `~/storage/downloads/campus-qps-fixed.zip`, already extracted once to `~/campus-qps` |
| Local repo folder | `~/campus-qps` |
| Where zips from the AI land | `~/storage/downloads` (after `termux-setup-storage`) |
| Supabase project ref / URL | `mebfxiizwzzsjuuqftoy` / https://mebfxiizwzzsjuuqftoy.supabase.co (not secrets) |
| Supabase anon key | not recorded here; user puts it in GitHub secret `VITE_SUPABASE_ANON_KEY` (USER_ACTIONS 4) |
| Google OAuth redirect URI | https://mebfxiizwzzsjuuqftoy.supabase.co/auth/v1/callback (USER_ACTIONS 11) |
| Supabase CLI on this device | not used; run SQL in the Supabase dashboard or let GitHub Actions run it |

## Workflow the user follows (no repeats needed)
1. AI delivers `campus-qps-*.zip`; user saves it to Downloads.
2. In Termux: `bash ~/campus-qps/tools/termux/push.sh` (unzips over the repo, commits, pushes).
3. GitHub Actions runs the tests; user pastes the failing log (or says "green") into the chat.
4. User says "continue"; the AI reads CLAUDE.md and picks up from AI_LOG.md.

## One-time setup (first time only)
```bash
termux-setup-storage                       # tap Allow
pkg install -y git curl
# get the scripts out of the zip (first time only, before the repo exists):
mkdir -p ~/campus-qps && cd ~ && unzip -o ~/storage/downloads/campus-qps-fixed.zip
bash ~/campus-qps/tools/termux/setup.sh "harsha-maloth" "232861054+harsha-maloth@users.noreply.github.com"   # installs tools, git config, gh login
cd ~/campus-qps && git init && git add -A && git commit -m "chore: initial import"
git remote add origin https://github.com/iist-oss/iist-qps.git
git push -u origin main
# if the remote already has commits (e.g. a README): git pull origin main --allow-unrelated-histories --no-edit && git push -u origin main
```

## Everyday commands
```bash
bash ~/campus-qps/tools/termux/push.sh                         # newest zip in Downloads
bash ~/campus-qps/tools/termux/push.sh ~/storage/downloads/x.zip "fix: db tests"
cd ~/campus-qps && git status && git log --oneline | head      # inspect
gh run list --limit 3                                          # CI status
gh run view --log-failed | head -80                            # failing CI log to paste to the AI
```

## Troubleshooting
- `Permission denied` on ~/storage: run `termux-setup-storage` again and allow.
- Push asks for a password: run `gh auth login` then `gh auth setup-git` (GitHub no longer accepts passwords).
- `rejected (fetch first)`: `git pull --no-edit` then push again.
- Zip nested one folder deeper than expected: push.sh handles `campus-qps/` or flat.
- Keep Termux alive during long runs: `termux-wake-lock`.

## Change log (newest at bottom)
- 2026-10-04 – file created; setup scripts added in tools/termux/. All `?` values still unknown.
- 2026-10-04 – user gave: GitHub user harsha-maloth, no-reply email, repo iist-oss/iist-qps. Setup commands switched from `gh repo create` to `git remote add origin`. Still unknown: repo visibility, Supabase ref, university confirmation.
- 2026-10-04 – user gave Supabase URL (ref mebfxiizwzzsjuuqftoy). Unapplied so far: migrations, functions, secrets (USER_ACTIONS 3-14 not confirmed done).
- 2026-10-04 – setup.sh finished OK (gh login done). User preference recorded: no local tests, test on production. Observed: the follow-up git init/remote commands were pasted while setup.sh was still running and probably never executed; first push still pending. Also noticed `frontend/public/logo.svg` in the user's extracted copy that no AI session created – treat as the user's own file, keep it.
- 2026-10-04 – first push DONE (commit 511eda5, 57 files, branch main). Repo is public. Verified by a shallow clone: no secrets/.env in the repo. AI sessions have read-only git access to it; CI logs are not visible to the AI, so the user pastes failures.
- 2026-10-04 – Migrations 0001-0004 APPLIED to production project mebfxiizwzzsjuuqftoy (SQL editor said Success). CI on 0b396d7: all green. Added deploy-pages / deploy-functions / keepalive workflows (not yet run).
- 2026-10-04 – Site live at https://iist-oss.github.io/iist-qps/ (Pages deploy green, shows 0 papers = DB reachable). Allowed email domains: iist.ac.in, ug.iist.ac.in (university-only login wanted). Unconfirmed: whether university mail is Google-hosted; Google OAuth client not yet created; functions deploy needs SUPABASE_ACCESS_TOKEN.
