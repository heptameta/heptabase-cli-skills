#!/usr/bin/env node

// Read-only release-readiness report for heptabase-cli-skills.
//
// Usage: node preflight.mjs [--skip-validators]
//
// Checks manifest sync, the marketplace version rule, CLI compatibility range
// consistency, git state, tag availability, and (unless skipped) the same
// three validators CI runs. Prints PASS/WARN/SKIP/FAIL lines, then the exact
// release-plan commands only when tag-ready (no FAILs, clean tree, on main,
// not behind origin/main, validators ran). Exits 1 if any check FAILs.
// It never mutates anything: no writes, no tags, no pushes.

import { promises as fs } from "node:fs";
import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const results = [];

function record(level, name, detail) {
  results.push({ level, name, detail });
}

function findRepoRoot() {
  let dir = path.dirname(realpathSync(fileURLToPath(import.meta.url)));
  while (true) {
    if (existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      console.error("FAIL  repo-root  Could not locate .claude-plugin/plugin.json above the script.");
      process.exit(1);
    }
    dir = parent;
  }
}

const repoRoot = findRepoRoot();
const skipValidators = process.argv.includes("--skip-validators");

function run(command, commandArgs, { timeout = 120_000 } = {}) {
  try {
    const stdout = execFileSync(command, commandArgs, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });
    return { ok: true, output: stdout.trim() };
  } catch (error) {
    const output = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .map((chunk) => String(chunk).trim())
      .find((chunk) => chunk.length > 0);
    return { ok: false, output: output ?? "unknown error" };
  }
}

function parseSemver(value) {
  const match = SEMVER_RE.exec(value);
  return match ? match.slice(1).map(Number) : null;
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

async function readJson(relPath) {
  try {
    return JSON.parse(await fs.readFile(path.join(repoRoot, relPath), "utf8"));
  } catch {
    return null;
  }
}

// --- Manifest checks -------------------------------------------------------

const claudeManifest = await readJson(".claude-plugin/plugin.json");
const cursorManifest = await readJson(".cursor-plugin/plugin.json");
let version = null;

if (!claudeManifest || !cursorManifest) {
  record("FAIL", "manifests-readable", "Could not read/parse one of the plugin.json manifests.");
} else if (claudeManifest.version !== cursorManifest.version) {
  record(
    "FAIL",
    "manifests-in-sync",
    `.claude-plugin has ${claudeManifest.version}, .cursor-plugin has ${cursorManifest.version}.`,
  );
} else if (!parseSemver(claudeManifest.version)) {
  record("FAIL", "version-is-semver", `"${claudeManifest.version}" is not plain X.Y.Z.`);
} else {
  version = claudeManifest.version;
  record("PASS", "manifests-in-sync", `Both manifests declare ${version}.`);
}

const marketplace = await readJson(".claude-plugin/marketplace.json");
if (!marketplace) {
  record("FAIL", "marketplace-readable", "Could not read/parse .claude-plugin/marketplace.json.");
} else {
  const entriesWithVersion = (marketplace.plugins ?? []).filter((entry) => "version" in entry);
  if (entriesWithVersion.length > 0) {
    record(
      "FAIL",
      "marketplace-has-no-version",
      "A marketplace.json plugin entry declares a version; plugin.json must stay the single source of truth.",
    );
  } else {
    record("PASS", "marketplace-has-no-version", "No plugin entry shadows the plugin.json version.");
  }
}

// --- CLI compatibility range ------------------------------------------------

let cliRange = null;
let cliMinVersion = null;
try {
  const skillMd = await fs.readFile(path.join(repoRoot, "skills/heptabase-cli/SKILL.md"), "utf8");
  const frontmatterEnd = skillMd.indexOf("---", 3);
  const frontmatter = skillMd.slice(0, frontmatterEnd);
  const body = skillMd.slice(frontmatterEnd);
  const rangeMatch = /heptabase-cli-version-range:\s*"?([^"\n]+?)"?\s*$/m.exec(frontmatter);
  if (!rangeMatch) {
    record("FAIL", "cli-range-declared", "metadata.heptabase-cli-version-range not found in skill frontmatter.");
  } else {
    cliRange = rangeMatch[1];
    record("PASS", "cli-range-declared", `Skill declares CLI compatibility range ${cliRange}.`);
    const minMatch = /^>=(\d+\.\d+\.\d+)$/.exec(cliRange);
    if (minMatch) {
      cliMinVersion = minMatch[1];
      record("PASS", "cli-range-format", `Range is a minimum CLI version (${cliMinVersion}).`);
    } else {
      record(
        "FAIL",
        "cli-range-format",
        `Range ${cliRange} is not a minimum version like ">=0.10.0"; the skill declares only the oldest CLI it needs.`,
      );
    }
    if (body.includes(`\`${cliRange}\``)) {
      record("PASS", "cli-range-consistent", "Prose in SKILL.md repeats the same range as the frontmatter.");
    } else {
      record(
        "FAIL",
        "cli-range-consistent",
        `Frontmatter says ${cliRange} but the SKILL.md prose does not mention \`${cliRange}\`; update both places.`,
      );
    }
  }
} catch {
  record("FAIL", "cli-range-declared", "Could not read skills/heptabase-cli/SKILL.md.");
}

if (cliMinVersion) {
  const cliVersion = run("heptabase", ["--version"], { timeout: 15_000 });
  if (!cliVersion.ok) {
    record("SKIP", "installed-cli-matches-range", "heptabase CLI not available here; cannot cross-check the range.");
  } else {
    const installed = parseSemver(cliVersion.output);
    if (installed && compareSemver(installed, parseSemver(cliMinVersion)) >= 0) {
      record("PASS", "installed-cli-matches-range", `Installed CLI ${cliVersion.output} meets ${cliRange}.`);
    } else {
      record(
        "WARN",
        "installed-cli-matches-range",
        `Installed CLI is ${cliVersion.output}, older than ${cliRange}. ` +
          "Install a desktop app that ships a CLI in range to check the skill against it.",
      );
    }
  }
}

// --- Git state ---------------------------------------------------------------

let gitClean = false;
let onMain = false;
let notBehindOrigin = false;

const status = run("git", ["status", "--porcelain"]);
if (!status.ok) {
  record("FAIL", "git-clean", `git status failed: ${status.output}`);
} else if (status.output === "") {
  gitClean = true;
  record("PASS", "git-clean", "Working tree is clean.");
} else {
  const fileCount = status.output.split("\n").length;
  record("FAIL", "git-clean", `${fileCount} uncommitted change(s); commit or stash before tagging.`);
}

const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch.ok && branch.output === "main") {
  onMain = true;
  record("PASS", "on-main", "Currently on main.");
} else {
  record("WARN", "on-main", `Currently on "${branch.output}"; prepare on a branch, but tag only from updated main.`);
}

const aheadBehind = run("git", ["rev-list", "--left-right", "--count", "origin/main...HEAD"]);
if (aheadBehind.ok) {
  const [behind, ahead] = aheadBehind.output.split(/\s+/).map(Number);
  if (behind === 0) {
    notBehindOrigin = true;
    record("PASS", "up-to-date-with-origin", `HEAD is not behind origin/main (ahead by ${ahead}).`);
  } else {
    record("WARN", "up-to-date-with-origin", `HEAD is ${behind} commit(s) behind origin/main; pull before tagging.`);
  }
} else {
  record("SKIP", "up-to-date-with-origin", "Could not compare with origin/main.");
}

// --- Tag checks ---------------------------------------------------------------

if (version) {
  const tag = `v${version}`;

  const localTag = run("git", ["tag", "-l", tag]);
  if (localTag.ok && localTag.output === "") {
    record("PASS", "tag-available-locally", `${tag} does not exist locally.`);
  } else {
    record("FAIL", "tag-available-locally", `${tag} already exists locally; bump the version first.`);
  }

  const remoteTag = run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`], { timeout: 20_000 });
  if (!remoteTag.ok) {
    record("WARN", "tag-available-on-remote", "Could not query origin for existing tags (offline?).");
  } else if (remoteTag.output === "") {
    record("PASS", "tag-available-on-remote", `${tag} does not exist on origin.`);
  } else {
    record("FAIL", "tag-available-on-remote", `${tag} already exists on origin; bump the version first.`);
  }

  // Prefer origin tags when reachable so leftover local-only tags cannot inflate "latest".
  const remoteTags = run("git", ["ls-remote", "--tags", "origin", "refs/tags/v*"], { timeout: 20_000 });
  const tagNames = new Set();
  let source;
  if (remoteTags.ok) {
    source = "origin";
    for (const line of remoteTags.output.split("\n")) {
      const name = line.split("refs/tags/")[1]?.replace(/\^\{\}$/, "");
      if (name) tagNames.add(name);
    }
  } else {
    source = "local only (origin unreachable)";
    const localTags = run("git", ["tag", "-l", "v*"]);
    if (localTags.ok) {
      for (const line of localTags.output.split("\n")) {
        const name = line.trim();
        if (name) tagNames.add(name);
      }
    }
  }
  const tagVersions = [...tagNames].map((name) => parseSemver(name.replace(/^v/, ""))).filter(Boolean);
  if (tagVersions.length === 0) {
    record("PASS", "version-advances", `No previous release tags found (${source}).`);
  } else {
    const latest = tagVersions.sort(compareSemver).at(-1);
    const latestStr = latest.join(".");
    if (compareSemver(parseSemver(version), latest) > 0) {
      record("PASS", "version-advances", `${version} advances past the latest tag v${latestStr} (${source}).`);
    } else {
      record("FAIL", "version-advances", `${version} does not advance past the latest tag v${latestStr} (${source}).`);
    }
  }
}

// --- Validators (same three as CI) --------------------------------------------

let validatorsRan = false;
if (skipValidators) {
  record("SKIP", "validators", "Skipped (--skip-validators).");
} else {
  validatorsRan = true;
  const skillsRef = run("npx", ["--yes", "skills-ref", "validate", "./skills/heptabase-cli"], { timeout: 180_000 });
  record(
    skillsRef.ok ? "PASS" : "FAIL",
    "validate-skill (skills-ref)",
    skillsRef.ok ? "Skill is spec-valid." : skillsRef.output,
  );

  const claudeExists = run("which", ["claude"]);
  if (!claudeExists.ok) {
    record("SKIP", "validate-claude-marketplace", "claude CLI not installed here; CI will still run it.");
  } else {
    const claudeValidate = run("claude", ["plugin", "validate", "."], { timeout: 180_000 });
    record(
      claudeValidate.ok ? "PASS" : "FAIL",
      "validate-claude-marketplace",
      claudeValidate.ok ? "Marketplace manifest is valid." : claudeValidate.output,
    );
  }

  const cursorValidate = run("node", ["scripts/validate-cursor-plugin.mjs"], { timeout: 180_000 });
  record(
    cursorValidate.ok ? "PASS" : "FAIL",
    "validate-cursor-plugin",
    cursorValidate.ok ? "Cursor manifest is valid." : cursorValidate.output,
  );
}

// --- Report --------------------------------------------------------------------

const width = Math.max(...results.map((entry) => entry.name.length));
for (const entry of results) {
  console.log(`${entry.level.padEnd(4)}  ${entry.name.padEnd(width)}  ${entry.detail}`);
}

const failed = results.some((entry) => entry.level === "FAIL");
console.log("");
if (failed) {
  console.log("Not release-ready: fix the FAIL items above, then rerun preflight.");
  process.exit(1);
}

const tagReady =
  Boolean(version) &&
  Boolean(cliMinVersion) &&
  gitClean &&
  onMain &&
  notBehindOrigin &&
  validatorsRan;

if (tagReady) {
  console.log(`Release plan for v${version} (each step needs explicit maintainer confirmation):`);
  console.log(`  1. git tag v${version} && git push origin v${version}`);
  console.log(`  2. gh release create v${version} --title "Compatible with CLI v${cliMinVersion} and later" --generate-notes`);
  console.log(`  3. gh release view v${version}`);
} else {
  const blockers = [];
  if (!gitClean) blockers.push("working tree is not clean");
  if (!onMain) blockers.push("not on main");
  if (!notBehindOrigin) blockers.push("behind origin/main or could not compare");
  if (!validatorsRan) blockers.push("validators were skipped");
  if (!version || !cliMinVersion) blockers.push("version or CLI range is missing");
  console.log(
    `Checks passed with no FAILs, but not tag-ready yet (${blockers.join("; ")}). ` +
      "Land via PR if needed, then rerun preflight on updated main to get the release plan.",
  );
}
