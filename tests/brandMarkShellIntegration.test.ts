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

test('the splash spin stays on the mark, not on the element that transitions', () => {
  // `spin-in` sets transform AND opacity with a forwards fill, and animation
  // declarations outrank normal ones in the cascade. On the wrapper — which
  // carries `transition-all` and the phase's scale/opacity classes — it pins
  // both at the 100% frame and leaves those classes doing nothing. Swapping
  // the <img> for a <BrandMark> is not a reason to move it: BrandMark spreads
  // its `style` prop last, so the animation reaches the same element it always
  // did.
  const startup = readFileSync(join(root, 'src/shell/StartupAnimation.tsx'), 'utf8');
  const wrapper = startup
    .split('\n')
    .find(line => line.includes("phase === 'logo' ? 'scale-75 opacity-0'")) ?? '';
  assert.ok(wrapper, 'the phase wrapper is still there');
  assert.doesNotMatch(wrapper, /animation:/);
  assert.match(startup, /<BrandMark[\s\S]*style=\{\{ animation: 'spin-in/);
});
