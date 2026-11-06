# Contributing

## Setup (once per clone)

This is a **public** repo. Install the local pre-commit hook so staged changes are scanned for sensitive/internal data before every commit:

```bash
node .claude/skills/public-repo-guard/scripts/install-git-hook.mjs
```

Hooks live under `.git/` and are never committed. Details: [`.claude/skills/public-repo-guard/SKILL.md`](.claude/skills/public-repo-guard/SKILL.md).

## Agent skills layout

Maintainer skills live under [`.claude/skills/`](.claude/skills/). [`.agents/skills`](.agents/skills) is a symlink to that folder so Codex and other skills-compatible agents discover the same skills. Edit only under `.claude/skills/`. Product skills shipped to users live under [`skills/`](skills/) and are separate. See [AGENTS.md](AGENTS.md).

## Release Process

Release a new version when the Heptabase CLI interface changes or when the CLI version no longer matches the compatibility range declared in `skills/heptabase-cli/SKILL.md`.

Claude Code caches installed plugins by resolved plugin version. This repo uses explicit semantic versions, so users receive updates only when the plugin version changes. Pushing new commits without changing the version is not enough for installed Claude Code users.

Claude Code resolves the plugin version in this order:

1. `.claude-plugin/plugin.json` `version`
2. `.claude-plugin/marketplace.json` plugin entry `version`
3. Git commit SHA

Because `.claude-plugin/plugin.json` wins, keep the plugin version there as the single source of truth. Do not add a plugin entry `version` in `.claude-plugin/marketplace.json` unless we intentionally change the versioning strategy.

This repo also ships a Cursor plugin manifest at `.cursor-plugin/plugin.json` (single-plugin layout, no `marketplace.json`). Cursor reads its version from that file, so keep `.cursor-plugin/plugin.json` `version` in sync with `.claude-plugin/plugin.json` `version` on every release.

**Follow [`.claude/skills/release/SKILL.md`](.claude/skills/release/SKILL.md) for the full release process.** That skill is the source of truth for branching, bumping, preflight, tagging, and publishing.

## Version Bump Guidelines

- Use a patch bump for documentation-only skill fixes that do not change CLI compatibility.
- Use a minor bump when the skill supports new CLI commands, new non-breaking CLI behavior, or a higher minimum CLI version.
- Avoid major bumps for normal CLI interface changes. Reserve a major bump only for rare package-level changes, such as renaming the plugin, removing the primary skill, or changing the installation/distribution model.

## Release Checklist

Use the bundled scripts from the release skill (they locate the repo root themselves):

1. Create a feature branch from updated `main`.
2. Bump both plugin manifests together:
   ```bash
   node .claude/skills/release/scripts/bump-version.mjs patch
   ```
3. Raise the minimum in `skills/heptabase-cli/SKILL.md` `metadata.heptabase-cli-version-range` (`>=X.Y.Z`) only when the skill starts naming a command or behavior that older CLIs lack (frontmatter and the Prerequisites prose must match). A newer CLI alone does not need a skill release.
4. Commit the bump (and any CLI-range edit).
5. Run preflight and fix any FAILs:
   ```bash
   node .claude/skills/release/scripts/preflight.mjs
   ```
6. Land via a PR with a conventional-commit title, wait for CI, merge.
7. On updated `main`, rerun preflight (it prints the tag/release commands only when tag-ready), then tag and publish the GitHub release — only with explicit maintainer confirmation.

Preflight runs the same three validators CI uses (`skills-ref`, `claude plugin validate`, and `node scripts/validate-cursor-plugin.mjs`).
