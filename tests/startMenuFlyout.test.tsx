import { test } from 'node:test';
import assert from 'node:assert/strict';
// Must come before the component import — see the note in tests/dom.ts.
import { render, act } from './dom';
import StartMenu from '../src/shell/StartMenu';
import type { NavItem, NavSection } from '../src/shell/nav-types';

/**
 * Opening a submenu, at every depth, through the real component.
 *
 * Two regressions live here.
 *
 * 1. The menu could not go deeper than three levels. Level 2 was one piece of
 *    code and level 3 was a second, separately written one; there was never a
 *    third, so a 4th-level group rendered as a plain row that navigated to its
 *    own synthetic key and closed the menu.
 *
 * 2. A submenu could open and then shut itself. Each leaf row armed a 200ms
 *    "close the submenu" timer into a single ref WITHOUT clearing the timer
 *    already in it, so sweeping across two leaves on the way to a group left an
 *    orphaned timer that nothing could cancel — it fired after the group's
 *    submenu had opened and closed it under the pointer. That is what "the
 *    second level is slow, or sometimes just doesn't open" was.
 *
 * The hover here is the browser's: `mouseout` on the row being left, carrying
 * the row being entered as `relatedTarget`, which is what React turns into the
 * mouseenter/mouseleave pair the menu listens for.
 */

const NAV: (NavSection | NavItem)[] = [
  {
    label: 'Ops',
    items: [
      { to: '/alpha', label: 'Alpha' },
      { to: '/beta', label: 'Beta' },
      {
        to: '/group', label: 'Group',
        children: [
          {
            to: '/group/two', label: 'Two',
            children: [
              {
                to: '/group/two/three', label: 'Three',
                children: [{ to: '/group/two/three/four', label: 'Four' }],
              },
            ],
          },
        ],
      },
    ],
  },
];

function mount() {
  const view = render(
    <StartMenu
      open
      onClose={() => {}}
      openPage={() => {}}
      openWindows={[]}
      profile={{ first_name: 'Test' }}
      user={{ email: 'test@example.com' }}
      onLogout={() => {}}
      onNavigate={() => {}}
      taskbarPosition="bottom"
      taskbarH={48}
      navSections={NAV}
      categories={{ erp: ['Ops'], system: [] }}
    />,
  );

  const labels = () => [...view.container.querySelectorAll('button')].map(b => b.textContent?.trim());
  const row = (label: string) => {
    const found = [...view.container.querySelectorAll('button')].find(b => b.textContent?.trim() === label);
    assert.ok(found, `no row labelled "${label}" — menu shows ${JSON.stringify(labels())}`);
    return found;
  };

  let at: Element | null = null;
  /** Move the pointer onto `label`, from wherever it was. */
  const hover = (label: string) => {
    const to = row(label);
    act(() => {
      if (at) at.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: to }));
      else to.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    at = to;
  };
  const shows = (label: string) => labels().includes(label);

  return { ...view, hover, shows, labels };
}

/** Longer than the menu's 200ms close grace. */
const afterGrace = () => act(async () => { await new Promise(r => setTimeout(r, 260)); });

test('each level opens the next, however deep the nav data goes', async () => {
  const menu = mount();
  try {
    menu.hover('Ops');
    assert.ok(menu.shows('Alpha'), 'the section flyout opened');

    menu.hover('Group');
    assert.ok(menu.shows('Two'), 'level 3 opened');

    menu.hover('Two');
    assert.ok(menu.shows('Three'), 'level 4 opened — this is where the menu used to stop');

    menu.hover('Three');
    assert.ok(menu.shows('Four'), 'level 5 opened');
  } finally {
    menu.unmount();
  }
});

test('a submenu opened after sweeping across leaf rows stays open', async () => {
  const menu = mount();
  try {
    menu.hover('Ops');
    // Two leaves in a row: the second is what armed the un-cancellable timer.
    menu.hover('Alpha');
    menu.hover('Beta');
    menu.hover('Group');
    assert.ok(menu.shows('Two'), 'the submenu opened');
    await afterGrace();
    assert.ok(menu.shows('Two'), 'and no stale timer closed it again');
  } finally {
    menu.unmount();
  }
});

test('backing out to a leaf row closes the branch below it', async () => {
  const menu = mount();
  try {
    menu.hover('Ops');
    menu.hover('Group');
    menu.hover('Two');
    assert.ok(menu.shows('Three'));

    menu.hover('Alpha');
    assert.ok(menu.shows('Three'), 'not before the grace period — the pointer may be cutting a corner');
    await afterGrace();
    assert.ok(!menu.shows('Three'), 'level 4 closed');
    assert.ok(!menu.shows('Two'), 'and so did level 3');
    assert.ok(menu.shows('Alpha'), 'the section flyout the pointer is in stays');
  } finally {
    menu.unmount();
  }
});

test('switching sections drops the whole branch that was open', async () => {
  const menu = mount();
  try {
    menu.hover('Ops');
    menu.hover('Group');
    menu.hover('Two');
    assert.ok(menu.shows('Three'));

    // Same section again, from deep inside it: the flyout stays, the rest goes.
    menu.hover('Ops');
    assert.ok(menu.shows('Alpha'));
    assert.ok(!menu.shows('Two'), 'the nested panels closed with the branch');
  } finally {
    menu.unmount();
  }
});

test('a group row opens its submenu instead of navigating nowhere', async () => {
  let opened: string | null = null;
  const view = render(
    <StartMenu
      open
      onClose={() => {}}
      openPage={p => { opened = p; }}
      openWindows={[]}
      profile={{}}
      user={{}}
      onLogout={() => {}}
      onNavigate={() => {}}
      taskbarPosition="bottom"
      taskbarH={48}
      navSections={NAV}
      categories={{ erp: ['Ops'], system: [] }}
    />,
  );
  try {
    const row = (label: string) =>
      [...view.container.querySelectorAll('button')].find(b => b.textContent?.trim() === label)!;
    act(() => { row('Ops').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    // A group's `to` is a synthetic key with no page behind it, so clicking one
    // used to close the menu on a route that goes nowhere.
    act(() => { row('Group').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    assert.equal(opened, null);
    assert.ok([...view.container.querySelectorAll('button')].some(b => b.textContent?.trim() === 'Two'));

    act(() => { row('Alpha').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    assert.equal(opened, '/alpha', 'a leaf still navigates');
  } finally {
    view.unmount();
  }
});

test('a compact menu label stays on one row without hiding the full name', () => {
  const fullLabel = 'Customer Transactions Summary';
  const menuLabel = 'Customer Txn Summary';
  const nav: (NavSection | NavItem)[] = [
    {
      label: 'Sales',
      items: [
        {
          to: '/reports/sales/customer-transactions-summary',
          label: fullLabel,
          menuLabel,
        },
      ],
    },
  ];
  const view = render(
    <StartMenu
      open
      onClose={() => {}}
      openPage={() => {}}
      openWindows={[]}
      profile={{}}
      user={{}}
      onLogout={() => {}}
      onNavigate={() => {}}
      taskbarPosition="bottom"
      taskbarH={48}
      navSections={nav}
      categories={{ erp: ['Sales'], system: [] }}
    />,
  );

  try {
    const section = [...view.container.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Sales');
    assert.ok(section);
    act(() => { section.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });

    const row = [...view.container.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === menuLabel);
    assert.ok(row, 'the menu renders the explicit compact label');
    // The accessible name has to START with what is on screen, or voice
    // control ("click Customer Txn Summary") no longer matches the row.
    assert.equal(row.getAttribute('aria-label'), `${menuLabel}, ${fullLabel}`);
    assert.match(row.className, /\bwhitespace-nowrap\b/);
    assert.match(row.className, /\boverflow-hidden\b/);
    const label = row.querySelector('[data-menu-label]');
    assert.ok(label, 'the visible name is its own element');
    assert.match(label.className, /\btruncate\b/);
    // Abbreviated, so the full name is reachable without measuring anything.
    assert.equal(label.getAttribute('title'), fullLabel);
  } finally {
    view.unmount();
  }
});


test('an ordinary row is not given a name or a tooltip it does not need', () => {
  // Titling every row hangs a native tooltip off short, fully-visible labels —
  // and hovering a row is also what opens its flyout, so the two fight. A row
  // whose text content already IS its full name needs no aria-label either.
  const nav: (NavSection | NavItem)[] = [
    { label: 'Sales', items: [{ to: '/orders', label: 'Orders' }] },
  ];
  const view = render(
    <StartMenu
      open
      onClose={() => {}}
      openPage={() => {}}
      openWindows={[]}
      profile={{}}
      user={{}}
      onLogout={() => {}}
      onNavigate={() => {}}
      taskbarPosition="bottom"
      taskbarH={48}
      navSections={nav}
      categories={{ erp: ['Sales'], system: [] }}
    />,
  );

  try {
    const section = [...view.container.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Sales');
    assert.ok(section);
    assert.equal(section.getAttribute('aria-label'), null);
    act(() => { section.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });

    const row = [...view.container.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Orders');
    assert.ok(row);
    assert.equal(row.getAttribute('aria-label'), null);
    assert.equal(row.querySelector('[data-menu-label]')?.getAttribute('title'), null);
  } finally {
    view.unmount();
  }
});

test('search matches the full label even when the row shows a compact one', () => {
  // The compact form is a display concern. Typing the words a user knows the
  // report by has to keep finding it, or `menuLabel` would hide entries.
  const nav: (NavSection | NavItem)[] = [
    {
      label: 'Sales',
      items: [{ to: '/reports/ar', label: 'Accounts Receivable Report', menuLabel: 'AR Report' }],
    },
  ];
  const view = render(
    <StartMenu
      open
      onClose={() => {}}
      openPage={() => {}}
      openWindows={[]}
      profile={{}}
      user={{}}
      onLogout={() => {}}
      onNavigate={() => {}}
      taskbarPosition="bottom"
      taskbarH={48}
      navSections={nav}
      categories={{ erp: ['Sales'], system: [] }}
    />,
  );

  try {
    const search = view.container.querySelector('input');
    assert.ok(search);
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value',
      )?.set;
      setter?.call(search, 'Accounts Receivable');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const hit = [...view.container.querySelectorAll('button')]
      .find(button => button.textContent?.includes('AR Report'));
    assert.ok(hit, 'the full label matched even though the row reads "AR Report"');
    assert.equal(hit.getAttribute('aria-label'), 'AR Report, Accounts Receivable Report');
  } finally {
    view.unmount();
  }
});
