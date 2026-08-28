#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const repositoryRootPath = path.resolve(scriptDirectoryPath, "../../../..");
const canonicalSkillsRootPath = path.resolve(
  repositoryRootPath,
  ".claude/skills",
);
const commandArguments = process.argv.slice(2);
const supportedCommandArguments = new Set(["--changed", "--strict-ui"]);
const unsupportedCommandArguments = commandArguments.filter(
  (argument) => !supportedCommandArguments.has(argument),
);
const shouldCheckChangedSkillsOnly = commandArguments.includes("--changed");
const shouldRequireUiMetadataForAllSkills =
  commandArguments.includes("--strict-ui");
const errorMessages = [];
const warningMessages = [];

function toRepositoryRelativePath(filePath) {
  return path.relative(repositoryRootPath, filePath).split(path.sep).join("/");
}

function listFilePathsRecursively(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .flatMap((directoryEntry) => {
      const entryPath = path.resolve(directoryPath, directoryEntry.name);

      if (directoryEntry.isSymbolicLink()) {
        return [];
      }

      if (directoryEntry.isDirectory()) {
        return listFilePathsRecursively(entryPath);
      }

      return directoryEntry.isFile() ? [entryPath] : [];
    });
}

function readFrontmatter(skillFilePath) {
  const skillContent = fs.readFileSync(skillFilePath, "utf8");
  const skillLines = skillContent.split(/\r?\n/u);

  if (skillLines[0] !== "---") {
    errorMessages.push(
      `${toRepositoryRelativePath(skillFilePath)}: missing YAML frontmatter`,
    );
    return { frontmatter: "" };
  }

  const closingDelimiterOffset = skillLines
    .slice(1)
    .findIndex((line) => line === "---");

  if (closingDelimiterOffset === -1) {
    errorMessages.push(
      `${toRepositoryRelativePath(skillFilePath)}: unclosed YAML frontmatter`,
    );
    return { frontmatter: "" };
  }

  return {
    frontmatter: skillLines.slice(1, closingDelimiterOffset + 1).join("\n"),
  };
}

function unquoteYamlScalar(rawValue) {
  if (rawValue === undefined) {
    return undefined;
  }

  const trimmedValue = rawValue.trim();
  const firstCharacter = trimmedValue.at(0);
  const lastCharacter = trimmedValue.at(-1);
  const hasMatchingQuotes =
    (firstCharacter === '"' && lastCharacter === '"') ||
    (firstCharacter === "'" && lastCharacter === "'");

  return hasMatchingQuotes ? trimmedValue.slice(1, -1) : trimmedValue;
}

function readTopLevelScalar(frontmatter, fieldName) {
  const fieldPrefix = `${fieldName}:`;
  const frontmatterLines = frontmatter.split(/\r?\n/u);
  const matchingLineIndex = frontmatterLines.findIndex((line) =>
    line.startsWith(fieldPrefix),
  );

  if (matchingLineIndex === -1) {
    return undefined;
  }

  const rawValue = frontmatterLines[matchingLineIndex]
    .slice(fieldPrefix.length)
    .trim();
  const isFoldedBlock =
    rawValue === ">" || rawValue === ">-" || rawValue === ">+";
  const isLiteralBlock =
    rawValue === "|" || rawValue === "|-" || rawValue === "|+";

  if (!isFoldedBlock && !isLiteralBlock) {
    return unquoteYamlScalar(rawValue);
  }

  const remainingFrontmatterLines = frontmatterLines.slice(
    matchingLineIndex + 1,
  );
  const blockEndOffset = remainingFrontmatterLines.findIndex(
    (line) => line.length > 0 && !/^\s/u.test(line),
  );
  const blockLines = remainingFrontmatterLines
    .slice(
      0,
      blockEndOffset === -1 ? remainingFrontmatterLines.length : blockEndOffset,
    )
    .map((line) => line.trim());

  return blockLines.join(isFoldedBlock ? " " : "\n").trim();
}

function readSectionScalar(yamlContent, sectionName, fieldName) {
  const yamlLines = yamlContent.split(/\r?\n/u);
  const sectionLineIndex = yamlLines.findIndex(
    (line) => line === `${sectionName}:`,
  );

  if (sectionLineIndex === -1) {
    return undefined;
  }

  const nextSectionOffset = yamlLines
    .slice(sectionLineIndex + 1)
    .findIndex((line) => line.length > 0 && !/^\s/u.test(line));
  const sectionEndIndex =
    nextSectionOffset === -1
      ? yamlLines.length
      : sectionLineIndex + nextSectionOffset + 1;
  const fieldPrefix = `${fieldName}:`;
  const sectionLines = yamlLines.slice(sectionLineIndex + 1, sectionEndIndex);
  const matchingLine = sectionLines.find((line) => {
    return line.trimStart().startsWith(fieldPrefix);
  });

  return unquoteYamlScalar(matchingLine?.trimStart().slice(fieldPrefix.length));
}

function readBooleanValue({ fieldName, filePath, rawValue, defaultValue }) {
  if (rawValue === undefined) {
    return defaultValue;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  errorMessages.push(
    `${toRepositoryRelativePath(filePath)}: ${fieldName} must be true or false`,
  );
  return undefined;
}

function listChangedFilePaths() {
  const gitCommandArgumentLists = [
    ["diff", "--name-only", "HEAD", "--", ".claude/skills"],
    ["ls-files", "--others", "--exclude-standard", "--", ".claude/skills"],
  ];

  return gitCommandArgumentLists.flatMap((gitCommandArguments) => {
    const result = spawnSync("git", gitCommandArguments, {
      cwd: repositoryRootPath,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || "git skill change lookup failed");
    }

    return result.stdout
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((filePath) => path.resolve(repositoryRootPath, filePath));
  });
}

function checkCanonicalLayout() {
  if (!fs.existsSync(canonicalSkillsRootPath)) {
    errorMessages.push(".claude/skills: canonical skills directory is missing");
    return;
  }

  const agentsSkillsPath = path.resolve(repositoryRootPath, ".agents/skills");

  if (!fs.existsSync(agentsSkillsPath)) {
    errorMessages.push(
      ".agents/skills: expected a symlink to ../.claude/skills",
    );
  } else if (!fs.lstatSync(agentsSkillsPath).isSymbolicLink()) {
    errorMessages.push(
      ".agents/skills: expected a symlink, but found another file type",
    );
  } else if (
    fs.realpathSync(agentsSkillsPath) !==
    fs.realpathSync(canonicalSkillsRootPath)
  ) {
    errorMessages.push(
      ".agents/skills: symlink must resolve to the canonical .claude/skills directory",
    );
  }

  [".cursor/skills", ".codex/skills"].forEach((alternateSkillsPath) => {
    const absoluteAlternateSkillsPath = path.resolve(
      repositoryRootPath,
      alternateSkillsPath,
    );
    const alternateSkillFilePaths = listFilePathsRecursively(
      absoluteAlternateSkillsPath,
    ).filter((filePath) => {
      if (path.basename(filePath) !== "SKILL.md") {
        return false;
      }

      // Personal Cursor skills are local and may stay outside the team skill directory.
      const isPersonalCursorSkill =
        alternateSkillsPath === ".cursor/skills" &&
        path
          .relative(absoluteAlternateSkillsPath, filePath)
          .split(path.sep)
          .at(0) === "personal";

      return !isPersonalCursorSkill;
    });

    alternateSkillFilePaths.forEach((skillFilePath) => {
      errorMessages.push(
        `${toRepositoryRelativePath(skillFilePath)}: move team skills to .claude/skills`,
      );
    });
  });
}

function collectSkillRecords() {
  return listFilePathsRecursively(canonicalSkillsRootPath)
    .filter((filePath) => path.basename(filePath) === "SKILL.md")
    .map((skillFilePath) => {
      const skillDirectoryPath = path.dirname(skillFilePath);
      const { frontmatter } = readFrontmatter(skillFilePath);
      const skillName = readTopLevelScalar(frontmatter, "name");
      const skillDescription = readTopLevelScalar(frontmatter, "description");

      if (!skillName) {
        errorMessages.push(
          `${toRepositoryRelativePath(skillFilePath)}: name is required`,
        );
      } else if (skillName !== path.basename(skillDirectoryPath)) {
        errorMessages.push(
          `${toRepositoryRelativePath(skillFilePath)}: name must match the parent directory`,
        );
      }

      if (!skillDescription) {
        errorMessages.push(
          `${toRepositoryRelativePath(skillFilePath)}: description is required`,
        );
      }

      const shouldDisableModelInvocation = readBooleanValue({
        fieldName: "disable-model-invocation",
        filePath: skillFilePath,
        rawValue: readTopLevelScalar(frontmatter, "disable-model-invocation"),
        defaultValue: false,
      });

      return {
        shouldDisableModelInvocation,
        skillDescription,
        skillDirectoryPath,
        skillFilePath,
        skillName,
      };
    });
}

function checkOpenAiMetadata({ isUiMetadataRequired, skillRecord }) {
  const openAiMetadataFilePath = path.resolve(
    skillRecord.skillDirectoryPath,
    "agents/openai.yaml",
  );
  const relativeMetadataFilePath = toRepositoryRelativePath(
    openAiMetadataFilePath,
  );

  if (!fs.existsSync(openAiMetadataFilePath)) {
    if (skillRecord.shouldDisableModelInvocation === true) {
      errorMessages.push(
        `${relativeMetadataFilePath}: human-invocation-only skills require Codex UI metadata and policy`,
      );
    } else if (isUiMetadataRequired) {
      errorMessages.push(
        `${relativeMetadataFilePath}: missing Codex UI metadata`,
      );
    }
    return;
  }

  const metadataContent = fs.readFileSync(openAiMetadataFilePath, "utf8");
  const displayName = readSectionScalar(
    metadataContent,
    "interface",
    "display_name",
  );
  const shortDescription = readSectionScalar(
    metadataContent,
    "interface",
    "short_description",
  );
  const defaultPrompt = readSectionScalar(
    metadataContent,
    "interface",
    "default_prompt",
  );
  const interfaceFieldChecks = [
    ["interface.display_name", displayName],
    ["interface.short_description", shortDescription],
    ["interface.default_prompt", defaultPrompt],
  ];

  interfaceFieldChecks.forEach(([fieldName, fieldValue]) => {
    if (fieldValue) {
      return;
    }

    if (isUiMetadataRequired) {
      errorMessages.push(
        `${relativeMetadataFilePath}: ${fieldName} is required`,
      );
    }
  });

  if (
    shortDescription &&
    (shortDescription.length < 25 || shortDescription.length > 64)
  ) {
    errorMessages.push(
      `${relativeMetadataFilePath}: interface.short_description must contain 25 to 64 characters`,
    );
  }

  if (
    defaultPrompt &&
    skillRecord.skillName &&
    !defaultPrompt.includes(`$${skillRecord.skillName}`)
  ) {
    errorMessages.push(
      `${relativeMetadataFilePath}: interface.default_prompt must mention $${skillRecord.skillName}`,
    );
  }

  const rawAllowImplicitInvocation = readSectionScalar(
    metadataContent,
    "policy",
    "allow_implicit_invocation",
  );
  const shouldAllowImplicitInvocation = readBooleanValue({
    fieldName: "policy.allow_implicit_invocation",
    filePath: openAiMetadataFilePath,
    rawValue: rawAllowImplicitInvocation,
    defaultValue: true,
  });

  if (
    skillRecord.shouldDisableModelInvocation !== undefined &&
    shouldAllowImplicitInvocation !== undefined &&
    skillRecord.shouldDisableModelInvocation === shouldAllowImplicitInvocation
  ) {
    errorMessages.push(
      `${relativeMetadataFilePath}: Codex and Claude/Cursor invocation policies disagree`,
    );
  }
}

function checkSkillConflicts(skillRecords) {
  const recordsByName = groupItemsBy(
    skillRecords.filter((skillRecord) => skillRecord.skillName),
    (skillRecord) => skillRecord.skillName,
  );

  recordsByName.forEach((matchingSkillRecords, skillName) => {
    if (matchingSkillRecords.length < 2) {
      return;
    }

    errorMessages.push(
      `duplicate skill name "${skillName}": ${matchingSkillRecords
        .map((skillRecord) =>
          toRepositoryRelativePath(skillRecord.skillFilePath),
        )
        .join(", ")}`,
    );
  });

  const recordsByDescription = groupItemsBy(
    skillRecords.filter((skillRecord) => skillRecord.skillDescription),
    (skillRecord) =>
      skillRecord.skillDescription.toLowerCase().replace(/\s+/gu, " ").trim(),
  );

  recordsByDescription.forEach((matchingSkillRecords) => {
    const matchingSkillNames = new Set(
      matchingSkillRecords.map((skillRecord) => skillRecord.skillName),
    );

    if (matchingSkillNames.size < 2) {
      return;
    }

    warningMessages.push(
      `identical descriptions may overlap: ${matchingSkillRecords
        .map((skillRecord) =>
          toRepositoryRelativePath(skillRecord.skillFilePath),
        )
        .join(", ")}`,
    );
  });
}

function groupItemsBy(items, getKey) {
  return items.reduce((groupedItems, item) => {
    const key = getKey(item);
    const matchingItems = groupedItems.get(key) ?? [];
    matchingItems.push(item);
    groupedItems.set(key, matchingItems);
    return groupedItems;
  }, new Map());
}

function printMessages(label, messages) {
  if (messages.length === 0) {
    return;
  }

  console.error(`${label}:`);
  messages.sort().forEach((message) => {
    console.error(`- ${message}`);
  });
}

function main() {
  if (unsupportedCommandArguments.length > 0) {
    console.error(
      `Unsupported argument(s): ${unsupportedCommandArguments.join(", ")}`,
    );
    process.exitCode = 2;
    return;
  }

  if (shouldCheckChangedSkillsOnly && shouldRequireUiMetadataForAllSkills) {
    console.error("Use either --changed or --strict-ui, not both.");
    process.exitCode = 2;
    return;
  }

  // Validate canonical paths and discovery symlinks before reading every skill's
  // required frontmatter and checking that its name matches its directory.
  checkCanonicalLayout();
  const skillRecords = collectSkillRecords();
  const changedFilePaths = shouldCheckChangedSkillsOnly
    ? listChangedFilePaths()
    : [];

  // Normal checks require complete UI metadata for human-invocation-only skills
  // and validate any metadata that is present. --strict-ui extends the complete
  // UI metadata requirement to every skill.
  skillRecords.forEach((skillRecord) => {
    const isChangedSkill = changedFilePaths.some(
      (changedFilePath) =>
        changedFilePath === skillRecord.skillDirectoryPath ||
        changedFilePath.startsWith(
          `${skillRecord.skillDirectoryPath}${path.sep}`,
        ),
    );
    const shouldCheckMetadata = !shouldCheckChangedSkillsOnly || isChangedSkill;
    const isUiMetadataRequired =
      shouldRequireUiMetadataForAllSkills ||
      skillRecord.shouldDisableModelInvocation === true;

    if (shouldCheckMetadata) {
      checkOpenAiMetadata({
        isUiMetadataRequired,
        skillRecord,
      });
    }
  });

  // Compare every skill because a changed skill can conflict with an unchanged one.
  checkSkillConflicts(skillRecords);

  printMessages("Warnings", warningMessages);
  printMessages("Errors", errorMessages);

  if (errorMessages.length > 0) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Skill check passed: ${skillRecords.length} skill(s), ${warningMessages.length} warning(s).\n`,
  );
}

main();
