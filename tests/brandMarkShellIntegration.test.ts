import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.REPO_ROOT ?? process.cwd();

test('shell brand icon slots delegate to BrandMark instead of raw images', () => {
  const layout = readFileSync(join(root, 'src/shell/Layout.tsx'), 'utf8');
  const sidebar = readFileSync(join(root, 'src/shell/Sidebar.tsx'), 'utf8');
  const startup = readFileSync(join(root, 'src/shell/StartupAnimation.tsx'), 'utf8');
  const logout = readFileSync(join(root, 'src/shell/LogoutAnimation.tsx'), 'utf8');
  const mobile = readFileSync(join(root, 'src/shell/MobileAppLanding.tsx'), 'utf8');
  assert.match(layout, /<BrandMark[\s\S]*src=\{brandIcon\}/);
  assert.doesNotMatch(layout, /<img src=\{brandIcon\}/);
  assert.match(sidebar, /<BrandMark[\s\S]*src=\{productIcon\}/);
  assert.doesNotMatch(sidebar, /<img src=\{productIcon\}/);
  assert.match(startup, /<BrandMark[\s\S]*src=\{logo\}/);
  assert.doesNotMatch(startup, /<img src=\{logo\}/);
  assert.match(logout, /<BrandMark[\s\S]*src=\{logo\}/);
  assert.doesNotMatch(logout, /<img src=\{logo\}/);
  assert.match(mobile, /<BrandMark[\s\S]*src=\{productIcon\}/);
  assert.doesNotMatch(mobile, /<img src=\{productIcon\}/);
});
