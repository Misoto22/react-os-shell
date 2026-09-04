/**
 * Assemble pending release fragments into a versioned release.
 *
 * Replaces the hand-bumped `package.json` + `CHANGELOG.md` convention. Under
 * that convention the next version number was shared mutable state that every
 * open branch wrote to, and git auto-merged the collision silently: two
 * branches both writing `"version": "4.93.0"` merge without a conflict and
 * both pull-request runs stay green, because a green check proves the merge
 * ref that existed when it ran, not the main that exists at merge time. On
 * 2026-09-04 four open pull requests claimed 4.93.0 at once, and every one of
 * the 28 pairs among the nine open branches conflicted — on `CHANGELOG.md`,
 * `package.json` and `package-lock.json` and on nothing else. Two branches
 * rewriting the same 200-line hook merged clean; the release files were the
 * only contention in the repository.
 *
 * So each pull request now adds one uniquely-named fragment under `.changes/`
 * (see `.changes/README.md`) and THIS script — run by the serialised
 * main-branch job in `.github/workflows/release-assemble.yml`, never by hand
 * on a branch — assigns the version at merge time:
 *
 *   * next version = current `package.json` version + the highest `bump:`
 *     among the pending fragments (one release per run, so merges that race
 *     batch into a single version rather than burning one each);
 *   * prepends one `## X.Y.Z` section to `CHANGELOG.md`, built from the
 *     fragment bodies verbatim;
 *   * writes the version into `package.json` and `package-lock.json`;
 *   * deletes the consumed fragments.
 *
 * The bodies are carried through VERBATIM rather than flattened into a list of
 * strings. This changelog's entries are prose — nested paragraphs, code spans,
 * an argument for why a default moved — and that is the format a consumer
 * reads on npm. A fragment is therefore written as the changelog section it
 * will become, and the assembler only decides which number sits above it.
 *
 * Pure file transform: no git, and NO side effect on import — the command
 * line lives in `assemble-release.mjs` next door. A `main`-guard here would
 * be a trap: the spec is bundled by esbuild before it runs, and inside a
 * bundle `import.meta.url` and `process.argv[1]` are the same path, so the
 * guard passes and the module releases the repository on import.
 *
 * The workflow step owns commit/push/retry, so this stays runnable locally
 * for a dry run. Exported for `tests/releaseFragments.test.ts`.
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const CHANGES_DIR = '.changes';
export const PACKAGE_JSON = 'package.json';
export const PACKAGE_LOCK = 'package-lock.json';
export const CHANGELOG_MD = 'CHANGELOG.md';

const BUMP_LEVELS = ['major', 'minor', 'patch'];
const ALLOWED_KEYS = ['bump', 'title'];

export class FragmentError extends Error {}

/**
 * Strict frontmatter parse — a typo must fail the pull-request guard, not the
 * merge-time job, because by then the branch that wrote it is gone.
 */
export function parseFragment(text, name) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new FragmentError(`${name}: missing \`---\` frontmatter block`);
  const [, header, body] = match;
  const keys = {};
  for (const line of header.split('\n')) {
    if (!line.trim()) continue;
    const sep = line.indexOf(':');
    const key = sep === -1 ? '' : line.slice(0, sep).trim();
    if (!ALLOWED_KEYS.includes(key)) {
      throw new FragmentError(
        `${name}: bad frontmatter line ${JSON.stringify(line)} (allowed keys: ${ALLOWED_KEYS.join(', ')})`,
      );
    }
    keys[key] = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  if (!BUMP_LEVELS.includes(keys.bump)) {
    throw new FragmentError(
      `${name}: \`bump:\` must be one of ${BUMP_LEVELS.join('|')}, got ${JSON.stringify(keys.bump ?? '')}`,
    );
  }
  if (!keys.title) throw new FragmentError(`${name}: \`title:\` is required`);
  const notes = body.trim();
  if (!notes) throw new FragmentError(`${name}: changelog prose below the frontmatter is required`);
  // A fragment body becomes a changelog section verbatim, so it must not carry
  // its own heading — the assembler owns the `## X.Y.Z` line, and a second one
  // inside the body would split the release in the rendered file.
  if (/^##\s/m.test(notes)) {
    throw new FragmentError(
      `${name}: the body must not contain a \`## \` heading — the release number is stamped at merge time`,
    );
  }
  return { name, bump: keys.bump, title: keys.title, notes };
}

export function pendingFragments(dir = CHANGES_DIR) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter(n => n.endsWith('.md') && n !== 'README.md')
    .sort()
    .map(n => parseFragment(readFileSync(path.join(dir, n), 'utf8'), path.join(dir, n)));
}

/**
 * Versions the registry already holds.
 *
 * `package.json` is not the whole truth about which numbers are taken. A
 * version published by hand from a branch never reaches `main`, so the tree
 * has no idea it is gone — and npm is append-only: a number that has shipped
 * describes one tarball for ever, to everyone who installed it.
 *
 * That is not hypothetical. 4.93.0 was published from a branch at 04:41 on
 * 2026-09-04 carrying one popup fix; two hours later this assembler read
 * `main` at 4.92.0, saw eight fragments, and stamped **the same number** on a
 * different set of changes. Both are called 4.93.0 and only one is installable.
 *
 * Returns null — rather than throwing or an empty list — when the registry
 * cannot be reached, so the caller can decide. An empty list would read as
 * "nothing is published", which is the exact wrong answer to fail towards.
 */
/**
 * @param {string} [name]
 * @param {string} [pkg]
 * @returns {Set<string> | null}
 */
export function publishedVersions(name, pkg = PACKAGE_JSON) {
  const packageName = name ?? JSON.parse(readFileSync(pkg, 'utf8')).name;
  try {
    const out = execFileSync('npm', ['view', packageName, 'versions', '--json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000,
    });
    const parsed = JSON.parse(out);
    return new Set(Array.isArray(parsed) ? parsed : [parsed]);
  } catch (err) {
    // A package that has never been published is a clean empty set, not a
    // failure — `npm view` exits non-zero with E404 for it.
    if (String(err.stdout ?? '').includes('E404') || String(err.message).includes('E404')) return new Set();
    return null;
  }
}

/**
 * The next version, skipping any the registry already holds.
 *
 * The skip walks the PATCH digit and never the minor or major: 4.93.0 taken
 * means 4.93.1, not 4.94.0. A minor bump has already said what compatibility
 * this release claims, and stepping it again to dodge a number would overstate
 * that — the skip is bookkeeping, not a second opinion about the change.
 *
 * @param {string} current
 * @param {string[]} bumps
 * @param {Set<string> | null} [published] omit where there is no registry to
 *   consult — a fork, a private mirror — and the plain arithmetic applies.
 * @returns {string}
 */
export function nextVersion(current, bumps, published = null) {
  if (!/^\d+\.\d+\.\d+$/.test(current)) {
    throw new FragmentError(`current version ${JSON.stringify(current)} is not plain MAJOR.MINOR.PATCH`);
  }
  const [major, minor, patch] = current.split('.').map(Number);
  // One release per run: merges that race batch under the highest bump asked
  // for, which is why no branch ever has to guess at a number.
  let next;
  if (bumps.includes('major')) next = `${major + 1}.0.0`;
  else if (bumps.includes('minor')) next = `${major}.${minor + 1}.0`;
  else next = `${major}.${minor}.${patch + 1}`;
  if (!published) return next;

  const start = next;
  let guard = 0;
  while (published.has(next)) {
    const [a, b, c] = next.split('.').map(Number);
    next = `${a}.${b}.${c + 1}`;
    if ((guard += 1) > 1000) {
      throw new FragmentError(`could not find a free version above ${start} — 1000 consecutive patches are published`);
    }
  }
  if (next !== start) {
    console.error(`::warning::${start} is already on the registry — assigning ${next} instead`);
  }
  return next;
}

export function readCurrentVersion(packageJson = PACKAGE_JSON) {
  const version = JSON.parse(readFileSync(packageJson, 'utf8')).version;
  if (typeof version !== 'string') throw new FragmentError(`${packageJson}: no \`version\` field`);
  return version;
}

/**
 * One `## X.Y.Z` section, fragment bodies in filename order.
 *
 * Filename order and not merge order: it is the only ordering both a local dry
 * run and the workflow can agree on, since the workflow consumes whatever is
 * pending rather than replaying a merge sequence.
 */
export function renderSection(version, fragments) {
  return `## ${version}\n\n${fragments.map(f => f.notes).join('\n\n')}\n`;
}

/**
 * Prepend the section above the newest existing one.
 *
 * Anchored on the first `## ` rather than on a line number, so the Keep a
 * Changelog preamble can grow without moving the insertion point. A changelog
 * with no sections yet appends after the preamble.
 */
export function prependSection(section, changelogMd = CHANGELOG_MD) {
  const text = readFileSync(changelogMd, 'utf8');
  const at = text.search(/^## /m);
  if (at === -1) return writeFileSync(changelogMd, `${text.trimEnd()}\n\n${section}`);
  writeFileSync(changelogMd, `${text.slice(0, at)}${section}\n${text.slice(at)}`);
}

/**
 * Write the version into both manifests.
 *
 * `package-lock.json` carries it twice — the root and the `""` self-entry —
 * and npm rewrites both. A round trip through `JSON.parse`/`stringify` at two
 * spaces reproduces npm's own formatting byte for byte, so the release commit
 * shows two changed lines rather than a reformatted lockfile.
 */
export function writeVersion(version, packageJson = PACKAGE_JSON, packageLock = PACKAGE_LOCK) {
  const pkg = JSON.parse(readFileSync(packageJson, 'utf8'));
  pkg.version = version;
  writeFileSync(packageJson, `${JSON.stringify(pkg, null, 2)}\n`);

  const lock = JSON.parse(readFileSync(packageLock, 'utf8'));
  lock.version = version;
  if (lock.packages?.['']) lock.packages[''].version = version;
  writeFileSync(packageLock, `${JSON.stringify(lock, null, 2)}\n`);
}

export function assemble() {
  const fragments = pendingFragments();
  if (!fragments.length) throw new FragmentError('no pending fragments under .changes/ — nothing to assemble');
  const current = readCurrentVersion();
  // Fail closed. Reaching npm is cheap and a collision is not: a number that
  // has shipped cannot be taken back, and the branch that would have to be
  // renumbered is already merged by the time anyone notices.
  const published = publishedVersions();
  if (!published) {
    throw new FragmentError(
      'could not read the published versions from npm — refusing to assign a number blind, '
      + 'because a collision with an already-published version is not reversible. Re-run when the registry is reachable.',
    );
  }
  const version = nextVersion(current, fragments.map(f => f.bump), published);
  prependSection(renderSection(version, fragments));
  writeVersion(version);
  for (const f of fragments) unlinkSync(f.name);
  console.error(
    `${current} -> ${version} (${fragments.length} fragment(s): ${fragments.map(f => path.basename(f.name)).join(', ')})`,
  );
  return version;
}
