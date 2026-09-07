---
name: release
description: Release a new version of heptabase-cli-skills, the public Agent Skills plugin package for the Heptabase CLI. Use whenever asked to release, publish, ship, tag, or bump the version of this skills package/plugin, to check whether it is release-ready, or to create its GitHub release. Covers version bumping across plugin manifests, preflight validation, tagging, and publishing the GitHub release. Not for releasing the Heptabase desktop app or the heptabase CLI binary itself — those are versioned separately.
allowed-tools: Bash(node *) Bash(npx --yes skills-ref *) Bash(git status *) Bash(git log *) Bash(git tag -l *) Bash(git describe *) Bash(git rev-parse *) Bash(gh release list *) Bash(gh release view *) Bash(gh pr list *)
disable-model-invocation: true
metadata:
  internal: true
---

# Releasing heptabase-cli-skills

This repo ships a public plugin package installed via the Claude Code marketplace, Cursor, `npx skills`, and OpenCode. Claude Code caches installed plugins by resolved plugin version, so **users only receive updates when the version changes** — pushing commits without a bump ships nothing.

## Conventions (and why)

- **`.claude-plugin/plugin.json` `version` is the single source of truth.** Claude Code resolves the version as: `plugin.json` → `marketplace.json` plugin entry → commit SHA. Never add a `version` to a `marketplace.json` plugin entry — it would silently shadow future strategy changes.
- **`.cursor-plugin/plugin.json` must mirror the same version** on every release (Cursor reads its version from that file).
- **Tag format:** `vX.Y.Z` matching the manifest version.
- **GitHub release title:** `Compatible with CLI v<range>`, where `<range>` is `metadata.heptabase-cli-version-range` from `skills/heptabase-cli/SKILL.md` (e.g. `0.4.x` → "Compatible with CLI v0.4.x"). The title states compatibility, not features, and stays identical across releases in the same CLI range.
- **Release notes are auto-generated from merged PR titles** (`--generate-notes`). There is no CHANGELOG file. This means changes should land via PRs with clear conventional-commit titles (`feat: ...`, `fix: ...`) — the PR title is the changelog entry.

## Version bump rules

| Bump  | When                                                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------- |
| patch | Documentation-only skill fixes; no CLI compatibility change                                                 |
| minor | New CLI commands supported, new non-breaking CLI behavior, or a new CLI compatibility range                 |
| major | Rare package-level changes only: plugin rename, removing the primary skill, changing the distribution model |

## Bundled scripts

Run from anywhere inside the repo; they locate the repo root themselves.

- `scripts/bump-version.mjs <patch|minor|major|X.Y.Z> [--dry-run]` — updates both plugin manifests together (prepares both replacements, writes both, then re-reads to verify). Refuses to run if the manifests are out of sync, the target version does not advance, or a manifest does not contain exactly one `"version": "…"` needle. Prints JSON. It does NOT touch `metadata.heptabase-cli-version-range` — that is a judgment call (step 5).
- `scripts/preflight.mjs [--skip-validators]` — read-only release-readiness report: manifest sync, marketplace version rule, CLI range consistency (frontmatter vs prose), installed CLI vs declared range, clean tree, branch, tag availability, version advances past the latest origin tag (falls back to local tags only when origin is unreachable), and the three official validators (skills-ref, `claude plugin validate`, Cursor manifest). Exits non-zero on any FAIL. Prints the exact release-plan commands only when tag-ready: no FAILs, clean tree, on `main`, not behind `origin/main`, and validators were not skipped. On a feature branch it may still pass with no FAILs and tell you to land the PR first.

## Release process

1. **Review what shipped** since the last release to choose the bump:
   ```bash
   git log $(git describe --tags --abbrev=0)..HEAD --oneline
   gh pr list --state merged --limit 20
   ```
2. **Decide the bump type** using the rules above. If the changes span categories, the highest category wins. Confirm with the maintainer when ambiguous.
3. **Create a feature branch** from updated `main` (do not bump or commit release changes directly on `main`):
   ```bash
   git checkout main && git pull
   git checkout -b release/vX.Y.Z
   ```
4. **Bump the version:**
   ```bash
   node .claude/skills/release/scripts/bump-version.mjs patch
   ```
5. **Only if the supported CLI range changed** (e.g. CLI 0.4.x → 0.5.x): update `metadata.heptabase-cli-version-range` in `skills/heptabase-cli/SKILL.md` — in both the frontmatter and the prose sentence under Prerequisites that repeats the range. Preflight verifies they agree.
6. **Commit the bump** (and any CLI-range edit). Preflight requires a clean tree, so do not run it against uncommitted manifest edits.
7. **Run preflight** and fix any FAILs:
   ```bash
   node .claude/skills/release/scripts/preflight.mjs
   ```
   On a feature branch, `on-main` is a WARN and the release plan is withheld — that is expected before the PR merges.
8. **Land the changes via a PR** with a conventional-commit title (it becomes the release-notes entry). CI runs the same three validators. Wait for merge.
9. **On updated main**, pull, rerun preflight (it should now be tag-ready and print the release plan), then tag — this is public, so ask the maintainer for explicit confirmation first:
   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```
10. **Publish the GitHub release** — again only with explicit confirmation. Use the exact command from preflight's release plan; it looks like:
    ```bash
    gh release create vX.Y.Z --title "Compatible with CLI v0.4.x" --generate-notes
    ```
11. **Verify:** `gh release view vX.Y.Z`. Installed users pick it up through the plugin update flows documented in README.md.

## Safety

- Tagging, pushing tags, and publishing releases are public and effectively irreversible. Never run steps 9–10 without the maintainer's explicit go-ahead in the current conversation, and never batch them silently with other work.
- If preflight reports FAIL on anything, stop and fix it — do not tag around a failing check.
- Never tag from a run that withheld the release plan (not tag-ready).
