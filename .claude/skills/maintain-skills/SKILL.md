---
name: maintain-skills
description: Maintain Agent Skills in a Heptabase repository across Claude Code, Codex, and Cursor. Use when creating, editing, moving, removing, or auditing files under .claude/skills/.
disable-model-invocation: false
---

# Maintain Skills

Apply only the Heptabase repository conventions below. Follow the active agent's normal skill-authoring guidance for general skill structure and writing quality.

## Use the canonical locations

- Treat `.claude/skills/<skill-name>/` as the canonical source for team-owned repository skills.
- Keep `.agents/skills` as a symlink to `../.claude/skills` so Codex and other Agent Skills clients discover the same skills.
- Do not copy team skills into `.cursor/skills/` or `.codex/skills/`.
- Use `convert-cursor-to-claude-skill` when converting rules, migrating commands, or fixing misplaced skill directories. This skill owns skill content and metadata, not path migration.

## Decide the invocation policy

For every new skill, explicitly decide whether the model may invoke it automatically.

For an existing skill, preserve its current invocation policy unless the user asks to change it or the skill's intended behavior has materially changed.

The user's stated invocation choice always wins; you can suggest or ask but not override it. Do not override it with the defaults below.

<!-- prettier-ignore -->
| Intended behavior | `SKILL.md` | `agents/openai.yaml` |
| --- | --- | --- |
| The agent may load it when relevant | Omit `disable-model-invocation`, or set it to `false` | Omit `policy.allow_implicit_invocation`, or set it to `true` |
| Only the user may start it | Set `disable-model-invocation: true` | Set `policy.allow_implicit_invocation: false` |

Because Codex allows implicit invocation by default, a human-invocation-only skill must include both settings and the complete UI metadata described below. An implicitly invocable skill may omit `agents/openai.yaml` unless it needs Codex UI metadata or dependencies.

When the user has not chosen:

- Prefer model invocation for repository conventions, reference knowledge, and guidance that should apply whenever relevant.
- Consider explicit-only invocation for named workflows whose timing the user is expected to control.
- Do not infer explicit-only invocation only because a workflow uses tools, requires approval, or can cause side effects. Authorization is still checked when the action occurs.
- If the correct invocation behavior is not easy to judge from the skill's purpose, ask the user before finalizing the skill.

## Add Codex metadata by invocation mode

For a skill that the model may invoke automatically, `agents/openai.yaml` is optional. Add or update it only when it serves a Codex-specific purpose:

- Improve a user-facing skill's name, description, default prompt, icon, or branding in Codex.
- Declare tool dependencies for Codex.
- Follow the user's request for Codex metadata.

Do not add the file only because a skill is new or being edited. Keep portable discovery in the `SKILL.md` name and description.

For a human-invocation-only skill, `agents/openai.yaml` and these fields are required:

- `interface.display_name`
- `interface.short_description`
- `interface.default_prompt`
- `policy.allow_implicit_invocation: false`

The skill selector is the primary entry point for a human-invocation-only skill, so its name, description, and starter prompt must be clear there.

When adding or editing the file:

- Quote string values.
- For implicitly invocable skills, keep interface fields optional.
- When present or required, `interface.short_description` must contain 25 to 64 characters, and `interface.default_prompt` must mention `$skill-name`.
- Include `policy.allow_implicit_invocation` when needed to keep Codex behavior aligned with `disable-model-invocation`.
- Preserve unrelated interface, policy, and dependency fields.

Run the repository checker after creating or changing a skill:

```bash
node .claude/skills/maintain-skills/scripts/check-skills.mjs --changed
```

## Prevent conflicting skills

Before finalizing a new or changed skill:

1. Run `check-skills.mjs --changed` to detect mechanical conflicts.
2. Search `.claude/skills/` and relevant `AGENTS.md`, `CLAUDE.md`, `.claude/rules/`, and `.cursor/rules/` files for overlapping triggers or instructions. Read possible overlaps; the checker cannot judge whether prose is consistent.
3. Resolve each conflict introduced or affected by the change:
   - Frontmatter names must be unique within one repository. Separate repositories may reuse names.
   - For overlapping triggers, narrow the descriptions and state which skill owns each case.
   - For conflicting instructions, keep one source of truth or narrow the scopes so both can coexist.
   - Keep copies of the same team skill aligned across repositories.
4. If the correct behavior is unclear, ask the user. Report unrelated pre-existing conflicts without expanding the task to fix them.

## Validate the result

Run the checker from the repository root:

```bash
node .claude/skills/maintain-skills/scripts/check-skills.mjs --changed
```

For a full repository audit:

```bash
node .claude/skills/maintain-skills/scripts/check-skills.mjs
```

Standard checks require complete Codex UI metadata only for human-invocation-only skills.

For an optional audit that requires complete Codex UI metadata for every existing skill:

```bash
node .claude/skills/maintain-skills/scripts/check-skills.mjs --strict-ui
```

When a task changes skills in more than one repository, run the checker separately in each affected repository.

Review the final diff and confirm that:

- Only canonical `.claude/skills/` files changed.
- Invocation settings agree across `SKILL.md` and `agents/openai.yaml`.
- No affected skills give conflicting instructions.
- No unrelated skill or agent configuration was changed.
