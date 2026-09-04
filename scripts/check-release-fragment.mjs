/**
 * Pull-request guard: release metadata rides in a fragment, never in the
 * release files.
 *
 * Successor to the hand-bump convention. Versions are not chosen on a branch
 * at all any more — the serialised main-branch job assigns them at merge time
 * from `.changes/` fragments (see `scripts/release-fragments.mjs`), so a
 * same-number collision cannot exist by construction. What a branch CAN still
 * get wrong, this fails fast:
 *
 *   * no fragment added — the merge would ship with no version and no entry;
 *   * a malformed fragment — it would fail the assemble step AFTER the merge,
 *     when the branch that wrote it is gone;
 *   * hand-edits to `package.json`'s version, `package-lock.json`'s version or
 *     `CHANGELOG.md` — the racing convention sneaking back in.
 *
 * A pull request that legitimately ships no release — a workflow, a doc, a
 * test — carries the `no-version-bump` label and the workflow skips this job.
 *
 * Runs in `.github/workflows/version-check.yml`, which fetches origin/main
 * first.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { CHANGES_DIR, CHANGELOG_MD, PACKAGE_JSON, PACKAGE_LOCK, FragmentError, parseFragment }
  from './release-fragments.mjs';

const FRAGMENT_DOC = `${CHANGES_DIR}/README.md`;

const fail = (message) => {
  console.error(`::error title=release fragment check failed::${message}`);
  process.exit(1);
};

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

/**
 * The commit this branch's changes are measured against.
 *
 * Prefer the true merge base with origin/main. In CI the checkout is a SHALLOW
 * pull-request merge ref with no merge base inside the shallow horizon — there
 * HEAD is the merge of the branch into main, so `HEAD^1` IS the main tip it was
 * merged against (the workflow checks out `fetch-depth: 2` so it exists).
 * Never diff against origin/main's CURRENT tree: main's version files move on
 * every release commit, which would false-fail every open pull request the
 * moment one lands.
 */
const diffBase = () => {
  try {
    return git('merge-base', 'origin/main', 'HEAD').trim();
  } catch {
    return git('rev-parse', 'HEAD^1').trim();
  }
};

// [status, path] pairs for this branch's changes (renames keep the new path).
const changes = git('diff', '--name-status', diffBase(), 'HEAD')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const parts = line.split('\t');
    return [parts[0][0], parts[parts.length - 1]];
  });

const changed = (p) => changes.some(([, name]) => name === p);
const versionOf = (ref, p) => {
  try {
    return JSON.parse(git('show', `${ref}:${p}`)).version;
  } catch {
    return undefined;
  }
};

if (changed(CHANGELOG_MD)) {
  fail(
    `${CHANGELOG_MD} is release-bot-owned now — remove it from this pull request and put the ` +
    `release note in a .changes/ fragment instead (see ${FRAGMENT_DOC}).`,
  );
}

// package.json and package-lock.json are NOT bot-owned wholesale — a branch
// adding a dependency has to touch both. Only the `version` field is, so
// compare that one field rather than refusing the file.
for (const manifest of [PACKAGE_JSON, PACKAGE_LOCK]) {
  if (!changed(manifest)) continue;
  const before = versionOf(diffBase(), manifest);
  const after = versionOf('HEAD', manifest);
  if (before !== after) {
    fail(
      `${manifest} moves the version from ${before} to ${after} — the number is stamped at merge ` +
      `time, not chosen here. Revert that field and add a .changes/ fragment (see ${FRAGMENT_DOC}).`,
    );
  }
}

/**
 * A fragment filename already on origin/main would collide add/add at merge —
 * the one shared-write vector one-file-per-branch leaves open, since slugs are
 * author-chosen rather than generated. Catch it as a clear failure here
 * ("rename your fragment") instead of a surprise conflict later.
 */
const existsOnMain = (p) => {
  try {
    git('cat-file', '-e', `origin/main:${p}`);
    return true;
  } catch {
    return false;
  }
};

const added = changes
  .filter(([status, p]) => status === 'A' && p.startsWith(`${CHANGES_DIR}/`) && p.endsWith('.md') && p !== FRAGMENT_DOC)
  .map(([, p]) => p);

if (!added.length) {
  fail(
    `no release fragment on this branch — add ${CHANGES_DIR}/<branch-slug>.md with \`bump:\` + ` +
    `\`title:\` frontmatter and the changelog prose below it (see ${FRAGMENT_DOC}). ` +
    'A pull request that ships no release: add the no-version-bump label.',
  );
}

for (const p of added) {
  if (existsOnMain(p)) {
    fail(
      `${p} already exists on origin/main — its slug is taken. Rename this fragment (one file per ` +
      'pull request only avoids conflicts if the names do not collide).',
    );
  }
  try {
    const fragment = parseFragment(readFileSync(p, 'utf8'), p);
    console.log(`fragment OK: ${p} (bump: ${fragment.bump} — ${fragment.title})`);
  } catch (err) {
    if (err instanceof FragmentError) fail(err.message);
    throw err;
  }
}
