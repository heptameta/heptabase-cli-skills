Agent Skills for use with [Heptabase](https://heptabase.com/).

These skills follow the [Agent Skills specification](https://agentskills.io/specification) so they can be used by any skills-compatible agent, including Claude Code, Codex CLI, and Cursor.

## Installation

### Claude Code (Marketplace)

```
/plugin marketplace add heptameta/heptabase-cli-skills
/plugin install heptabase@heptabase-cli-skills
```

### npx skills

```
npx skills add git@github.com:heptameta/heptabase-cli-skills.git
```

### Claude Code

Add the contents of this repo to a `.claude` folder in the root of the project you're using with Claude Code. See more in the [official Claude Skills documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).

### Codex CLI

Copy the `skills/` directory into your Codex skills path (typically `~/.codex/skills`). See the [Agent Skills specification](https://agentskills.io/specification) for the standard skill format.

Codex sandbox note: if Heptabase starts but Codex says the CLI server is not ready, see [Codex sandbox troubleshooting](skills/heptabase-cli/references/codex-sandbox.md).

### Cursor (Marketplace)

Install from the Cursor Marketplace panel by searching for "Heptabase". See the [Cursor plugins docs](https://cursor.com/docs/plugins) for details.

### OpenCode

Clone the entire repo into the OpenCode skills directory (`~/.opencode/skills/`):

```
git clone https://github.com/heptameta/heptabase-cli-skills.git ~/.opencode/skills/heptabase-cli-skills
```

Do not copy only the inner `skills/` folder. Clone the full repo so the directory structure is `~/.opencode/skills/heptabase-cli-skills/skills/<skill>/SKILL.md`.

OpenCode auto-discovers all `SKILL.md` files under `~/.opencode/skills/`. No changes to `opencode.json` or any config file are needed. Skills become available after restarting OpenCode.

## Update

Update this skills package when the Heptabase CLI interface changes or when `heptabase --version` no longer matches the compatibility range declared in the skill frontmatter.

For Claude Code marketplace installs, refresh the marketplace, update the plugin, then reload plugins:

```
/plugin marketplace update heptabase-cli-skills
/plugin update heptabase@heptabase-cli-skills
/reload-plugins
```

For `npx skills` installs, rerun:

```
npx skills add git@github.com:heptameta/heptabase-cli-skills.git
```

For Cursor marketplace installs, update the plugin from the Cursor Marketplace panel after the new version is published.

For OpenCode installs, pull the latest repo:

```
git -C ~/.opencode/skills/heptabase-cli-skills pull
```

## Skills

<!-- prettier-ignore -->
| Skill                                 | Description                                                                                                                   |
|---|---|
| [heptabase-cli](skills/heptabase-cli) | Interact with Heptabase using the CLI to manage notes, journals, tags, cards, files, whiteboards, goals, courses, and lessons |
