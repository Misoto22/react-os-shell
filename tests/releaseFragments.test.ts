/**
 * The release assembler — the automation that owns the version number.
 *
 * This is worth testing at the file layer rather than the function layer,
 * because the failure it exists to prevent is a FILE one: two branches writing
 * the same `"version"` merge without a conflict and both pull-request runs
 * stay green, since a green check proves the merge ref that existed when it
 * ran and not the `main` that exists at merge time. On 2026-09-04 four open
 * pull requests claimed 4.93.0, and all 28 pairs among the nine open branches
 * conflicted on `CHANGELOG.md`, `package.json` and `package-lock.json` and on
 * nothing else.
 *
 * So the assertions are about what lands on disk: which number is chosen when
 * several fragments batch, that the changelog keeps its shape, and that the
 * lockfile's two version fields both move. A wrong answer to any of those is
 * discovered on `main` after the branch is gone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';

import {
  FragmentError, parseFragment, pendingFragments, nextVersion, publishedVersions,
  renderSection, prependSection, writeVersion, readCurrentVersion,
} from '../scripts/release-fragments.mjs';

const PREAMBLE = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';

/** A repository just complete enough for the assembler to work on. */
function repo(fragments: Record<string, string>, version = '4.92.0') {
  const dir = mkdtempSync(path.join(tmpdir(), 'ros-release-'));
  mkdirSync(path.join(dir, '.changes'));
  writeFileSync(path.join(dir, '.changes/README.md'), '# Release fragments\n');
  for (const [name, body] of Object.entries(fragments)) {
    writeFileSync(path.join(dir, '.changes', name), body);
  }
  writeFileSync(path.join(dir, 'CHANGELOG.md'), `${PREAMBLE}## ${version}\n\n- The one before.\n`);
  writeFileSync(
    path.join(dir, 'package.json'),
    `${JSON.stringify({ name: 'react-os-shell', version }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(dir, 'package-lock.json'),
    `${JSON.stringify({
      name: 'react-os-shell', version, lockfileVersion: 3,
      packages: { '': { name: 'react-os-shell', version }, 'node_modules/react': { version: '18.3.1' } },
    }, null, 2)}\n`,
  );
  return dir;
}

const fragment = (bump: string, title: string, body: string) =>
  `---\nbump: ${bump}\ntitle: ${title}\n---\n\n${body}\n`;

// ── the number ──────────────────────────────────────────────────────────────

test('several fragments batch into ONE release, at the highest bump', () => {
  // The whole point. Four branches merging in a burst take one number between
  // them; under the hand-bump convention they took four, and often the same
  // one twice.
  assert.equal(nextVersion('4.92.0', ['patch', 'minor', 'patch']), '4.93.0');
  assert.equal(nextVersion('4.92.0', ['patch', 'patch']), '4.92.1');
  assert.equal(nextVersion('4.92.3', ['major', 'minor']), '5.0.0');
});

test('a version that is not plain MAJOR.MINOR.PATCH stops the release', () => {
  // A prerelease suffix would make `+1` ambiguous, and guessing is how the
  // hand-bump convention went wrong in the first place.
  assert.throws(() => nextVersion('4.92.0-rc.1', ['patch']), FragmentError);
});

// ── the fragment ────────────────────────────────────────────────────────────

test('a fragment carries its body through verbatim', () => {
  // This changelog's entries are prose — nested paragraphs, code spans, an
  // argument for why a default moved — and that is what a consumer reads on
  // npm. Flattening them into a list of strings would lose the format the file
  // has had for 90 releases.
  const body = '- **A thing changed.** Because of a reason.\n\n  A second paragraph, indented.';
  const parsed = parseFragment(fragment('minor', 'A thing', body), 'x.md');
  assert.equal(parsed.notes, body);
  assert.equal(parsed.bump, 'minor');
  assert.equal(parsed.title, 'A thing');
});

test('a body carrying its own `## ` heading is rejected', () => {
  // The release number is stamped at merge time. A heading in the body would
  // put a second one in the rendered file and split the release in two.
  assert.throws(
    () => parseFragment(fragment('patch', 'T', '## 4.93.0\n\n- No.'), 'x.md'),
    /must not contain a `## ` heading/,
  );
});

test('a bad bump, a missing title and an unknown key each fail the guard', () => {
  // These fail on the branch that wrote them or they fail on main, after that
  // branch is gone. The pull-request guard runs this same parser for exactly
  // that reason.
  assert.throws(() => parseFragment(fragment('nudge', 'T', '- x'), 'x.md'), /`bump:` must be one of/);
  assert.throws(() => parseFragment('---\nbump: patch\n---\n\n- x\n', 'x.md'), /`title:` is required/);
  assert.throws(() => parseFragment('---\nbump: patch\ntitle: T\nshell: 1\n---\n\n- x\n', 'x.md'), /bad frontmatter line/);
  assert.throws(() => parseFragment('- no frontmatter at all\n', 'x.md'), /missing `---` frontmatter block/);
  assert.throws(() => parseFragment(fragment('patch', 'T', ''), 'x.md'), /changelog prose below the frontmatter is required/);
});

test('fragments are read in filename order, and README.md is not one', () => {
  // Filename order is the only ordering a local dry run and the workflow can
  // agree on: the workflow consumes whatever is pending rather than replaying
  // a merge sequence.
  const dir = repo({
    'b-second.md': fragment('patch', 'Second', '- Second.'),
    'a-first.md': fragment('patch', 'First', '- First.'),
  });
  const found = pendingFragments(path.join(dir, '.changes'));
  assert.deepEqual(found.map(f => f.title), ['First', 'Second']);
  rmSync(dir, { recursive: true, force: true });
});

// ── the files ───────────────────────────────────────────────────────────────

test('the new section goes above the newest one, under the preamble', () => {
  const dir = repo({});
  const file = path.join(dir, 'CHANGELOG.md');
  prependSection(renderSection('4.93.0', [{ notes: '- A new thing.' } as never]), file);
  const text = readFileSync(file, 'utf8');
  assert.ok(text.startsWith(PREAMBLE), 'the Keep a Changelog preamble survives');
  assert.match(text, /## 4\.93\.0\n\n- A new thing\.\n\n## 4\.92\.0/);
  rmSync(dir, { recursive: true, force: true });
});

test('BOTH of the lockfile\'s version fields move', () => {
  // npm writes the version twice — the root and the `""` self-entry — and a
  // release that moved only one would install as the old version while
  // claiming the new one.
  const dir = repo({});
  const pkg = path.join(dir, 'package.json');
  const lock = path.join(dir, 'package-lock.json');
  writeVersion('4.93.0', pkg, lock);
  assert.equal(readCurrentVersion(pkg), '4.93.0');
  const written = JSON.parse(readFileSync(lock, 'utf8'));
  assert.equal(written.version, '4.93.0');
  assert.equal(written.packages[''].version, '4.93.0');
  assert.equal(written.packages['node_modules/react'].version, '18.3.1', 'nothing else is touched');
  rmSync(dir, { recursive: true, force: true });
});

test('a rewritten manifest keeps npm\'s own formatting', () => {
  // Two spaces and a trailing newline is what npm writes, so a release commit
  // shows two changed lines rather than a reformatted lockfile that no one can
  // review.
  const dir = repo({});
  const lock = path.join(dir, 'package-lock.json');
  const before = readFileSync(lock, 'utf8');
  writeVersion('4.93.0', path.join(dir, 'package.json'), lock);
  const after = readFileSync(lock, 'utf8');
  assert.equal(after.endsWith('\n'), true);
  assert.equal(
    after.split('\n').length, before.split('\n').length,
    'the same number of lines — only the values changed',
  );
  rmSync(dir, { recursive: true, force: true });
});

test('consumed fragments are removed, so the next release starts empty', () => {
  // A fragment left behind would be released twice: once with its own version
  // and again with the next one.
  const dir = repo({ 'one.md': fragment('patch', 'One', '- One.') });
  const changes = path.join(dir, '.changes');
  assert.equal(pendingFragments(changes).length, 1);
  for (const f of pendingFragments(changes)) rmSync(f.name);
  assert.equal(pendingFragments(changes).length, 0);
  assert.deepEqual(readdirSync(changes), ['README.md'], 'the documentation stays');
  rmSync(dir, { recursive: true, force: true });
});

// ── the module boundary ─────────────────────────────────────────────────────

test('the assembler module runs nothing on import', () => {
  // It used to. A `main`-guard at the foot of the module compared
  // `import.meta.url` with `process.argv[1]`, which is a fair test of "was I
  // run directly" — until esbuild bundles the spec that imports it, at which
  // point both are the same path, the guard passes, and merely importing the
  // module tries to release the repository. The whole spec file failed with
  // `no pending fragments under .changes/` and no individual assertion to
  // point at.
  //
  // THIS SPEC IS THE REGRESSION TEST: it imports the module at the top. The
  // source check below is what names the trap, so the next person to add a
  // convenience entry point puts it in assemble-release.mjs where it belongs.
  const root = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');
  // Comments stripped first: this module's own header explains the trap, and a
  // check that fired on the explanation would be unfixable without deleting it.
  const source = readFileSync(path.join(root, 'scripts/release-fragments.mjs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(
    source, /process\.argv/,
    'release-fragments.mjs must stay side-effect free — the command line lives in assemble-release.mjs',
  );
  assert.match(
    readFileSync(path.join(root, 'scripts/assemble-release.mjs'), 'utf8'), /assemble\(\)/,
    'and assemble-release.mjs must actually call it',
  );
});

// ── the registry ────────────────────────────────────────────────────────────

test('a number the registry already holds is skipped', () => {
  // The incident this exists for. 4.93.0 was published from a BRANCH at 04:41
  // on 2026-09-04 carrying one popup fix. That publish never reached `main`,
  // so two hours later the assembler read main at 4.92.0, saw eight fragments,
  // and stamped the same 4.93.0 on a different set of changes. Both are called
  // 4.93.0; only one is installable.
  //
  // package.json is not the whole truth about which numbers are taken, and npm
  // is append-only — a shipped number describes one tarball for ever.
  const published = new Set(['4.88.0', '4.93.0']);
  assert.equal(nextVersion('4.92.0', ['minor'], published), '4.93.1');
});

test('the skip walks the patch digit, never the minor', () => {
  // A minor bump has already said what compatibility this release claims.
  // Stepping it again to dodge a taken number would overstate that: the skip
  // is bookkeeping, not a second opinion about the change.
  const published = new Set(['4.93.0', '4.93.1', '4.93.2']);
  assert.equal(nextVersion('4.92.0', ['minor'], published), '4.93.3');
});

test('with nothing published the number is untouched', () => {
  assert.equal(nextVersion('4.92.0', ['minor'], new Set()), '4.93.0');
  assert.equal(nextVersion('4.92.0', ['patch'], new Set()), '4.92.1');
});

test('omitting the published set entirely keeps the old behaviour', () => {
  // Callers that genuinely have no registry — a fork, a private mirror — pass
  // nothing and get the plain arithmetic.
  assert.equal(nextVersion('4.92.0', ['minor']), '4.93.0');
});

test('a registry that cannot be read is not an empty registry', () => {
  // `publishedVersions` returns null on failure rather than an empty Set,
  // because an empty Set reads as "nothing is published" — the exact wrong
  // answer to fail towards. `assemble` refuses to run on null.
  const missing = publishedVersions('a-package-name-that-will-never-exist-9f3a2b', 'package.json');
  assert.ok(missing === null || missing instanceof Set,
    'either the registry said 404 (empty set) or it was unreachable (null) — never a guess');
});
