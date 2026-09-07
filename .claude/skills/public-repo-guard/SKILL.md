---
name: public-repo-guard
description: This repo (heptabase-cli-skills) is PUBLIC — everything committed is visible to the world and permanent in git history. Use before EVERY commit, push, PR, or release here, and whenever adding or editing docs, skills, scripts, or examples in this repo. Scans staged changes for sensitive or internal data — credentials, tokens, private keys, emails, personal home paths, internal workspace URLs (Notion, Slack, Discord, Linear), real card/workspace UUIDs, IP addresses, secret-bearing filenames — and explains how to judge and fix findings. Also use when asked to review any content in this repo for public sharing.
allowed-tools: Bash(node *) Bash(git diff *) Bash(git status *) Bash(git ls-files *)
metadata:
  internal: true
---

# Public-repo guard

Everything in this repo ships to the world twice: it is a public GitHub repo, AND the whole repo is installed onto users' machines as a plugin. A leaked secret or internal detail is permanent — git history survives force-pushes in forks, caches, and mirrors. Prevention is the only cheap moment to act.

## What counts as sensitive here

- **Credentials of any kind**: API keys, tokens, private keys, passwords — including "test" or "expired" ones (they reveal naming schemes and invite confusion).
- **Personal / employee data**: email addresses, personal home paths like `/Users/<name>/...` (they leak usernames), real names of non-maintainers.
- **Internal workspace links**: Notion pages, Slack archives, Discord channels, Linear issues, Google Docs, Datadog dashboards. Public GitHub links and `app.heptabase.com` **placeholder patterns** are fine.
- **Real identifiers**: actual card/workspace/chat UUIDs from anyone's Heptabase data. Docs must use placeholders like `<cardId>`, `<workspaceId>`.
- **Infrastructure details**: non-loopback IPs, internal hostnames, unreleased product details.

## Workflow

1. **Before every commit**, scan the staged changes (this is also what the pre-commit hook runs):
   ```bash
   node .claude/skills/public-repo-guard/scripts/scan-sensitive.mjs --staged
   ```
2. **Judge each finding** — the scanner errs toward flagging; a finding is a question, not a verdict:
   - Real sensitive data → remove it, replace with a placeholder (`<your-token>`, `<cardId>`), or move it to private notes. Never "temporarily" commit it.
   - False positive (e.g. a deliberate documentation example) → append a `public-ok` marker comment to that line and say why in the PR. The scanner skips marked lines.
3. **Before a release or when auditing**, scan every tracked + untracked file:
   ```bash
   node .claude/skills/public-repo-guard/scripts/scan-sensitive.mjs --all
   ```
4. **The scanner is a net, not a guarantee.** It only knows patterns. Also apply judgment to things regex cannot see: screenshots, real user data or support-conversation excerpts, names/handles of people who did not consent, anything you would not put in a tweet. When reviewing, read the actual diff (`git diff --cached`) — not just the scan output.

## Scanner reference

`scripts/scan-sensitive.mjs [--staged | --all | <paths...>]`

- `--staged` (default): scans only lines being ADDED by the staged diff, plus staged filenames (catches `.env`, `.envrc`, `*.pem`, `id_rsa`, etc. even when their content evades patterns).
- `--all`: scans all tracked and untracked-but-not-ignored files. Use before releases.
- `<paths...>`: scans the given files fully. Use for reviewing a single doc.
- Exit code 0 = clean, 1 = findings to judge, 2 = usage error. Credential-like matches are printed masked so secrets don't end up in terminal logs.
- Built-in allowances: `example.com` / `noreply@` / `users.noreply.github.com` emails, `git@…` SSH clone URLs, loopback/any IPs (`127.0.0.1`, `0.0.0.0`, …), synthetic repeated-digit UUID placeholders (`11111111-1111-4111-…`), and lines carrying the `public-ok` marker.

## Hard enforcement: git pre-commit hook

Install once per clone (hooks are local, never committed):

```bash
node .claude/skills/public-repo-guard/scripts/install-git-hook.mjs
```

Every `git commit` (including via gt/Graphite) then runs the staged scan and blocks on findings. Bypassing with `git commit --no-verify` should be a deliberate, explained exception — if you bypass, say so in the PR description so a reviewer double-checks.

## If something sensitive already got committed

1. Treat any leaked credential as compromised the moment it is pushed: rotate/revoke it first — history cleanup is NOT mitigation.
2. MUST tell the maintainer IMMEDIATELY.
3. Removing it from history (BFG / `git filter-repo` + force-push) breaks clones and installed plugin caches — coordinate before attempting, and remember public forks/mirrors may retain the data anyway.
