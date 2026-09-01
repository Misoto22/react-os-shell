import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, act } from './dom';
import CartesianPlot from '../src/charts/CartesianPlot';
import TimeSeriesChart from '../src/charts/TimeSeriesChart';
import { runEscapeInterceptors } from '../src/shell/escapeInterceptors';

/**
 * A chart's Escape has to go through the shell's interceptor seam.
 *
 * A listener of the component's own cannot win: `Modal` listens on `window` in
 * the CAPTURE phase, and capture runs window BEFORE document — so Modal takes
 * the key first, closes the whole window, and stops propagation. Someone who
 * arrowed onto a band and pressed Escape to clear the crosshair lost the
 * window and their unsaved edits instead.
 *
 * `Select` and `FilterBar` were always on the seam; `Tooltip` moved in 4.30.1,
 * `DropdownMenu` in 4.54.0, `DatePicker` in 4.66.0. The charts are the fifth
 * time the same rule has been needed, which is why it is asserted at the seam
 * (`runEscapeInterceptors` returns true) and not as "the crosshair cleared" —
 * a component that clears from its own listener passes the naive test and
 * still eats the window.
 */

const escapeEvent = () =>
  new (window as Window & typeof globalThis).KeyboardEvent('keydown', {
    key: 'Escape', bubbles: true, cancelable: true,
  });

const arrowRight = (svg: SVGSVGElement) => {
  act(() => {
    svg.dispatchEvent(new (window as Window & typeof globalThis).KeyboardEvent('keydown', {
      key: 'ArrowRight', bubbles: true, cancelable: true,
    }));
  });
};

test('CartesianPlot: an active crosshair consumes Escape at the seam, an idle chart does not', () => {
  let seen: number | null = null;
  const view = render(
    <CartesianPlot labels={['a', 'b', 'c']} values={[1, 2, 3]} width={300} ariaLabel="Seam test">
      {({ active }) => {
        seen = active;
        return <g />;
      }}
    </CartesianPlot>,
  );
  try {
    // Idle: the chart must NOT claim Escape — that press belongs to the
    // window around it.
    assert.equal(runEscapeInterceptors(escapeEvent()), false, 'idle chart leaves Escape alone');

    const svg = view.container.querySelector('svg')!;
    arrowRight(svg as SVGSVGElement);
    assert.notEqual(seen, null, 'ArrowRight lit a band');

    let consumed = false;
    act(() => { consumed = runEscapeInterceptors(escapeEvent()); });
    assert.equal(consumed, true, 'an active crosshair consumes Escape at the seam');
    assert.equal(seen, null, 'and the crosshair clears');

    // And having cleared, the next Escape falls through to the window again.
    assert.equal(runEscapeInterceptors(escapeEvent()), false, 'the next Escape is the window’s');
  } finally {
    view.unmount();
  }
});

test('TimeSeriesChart: the crosshair rides the same seam', () => {
  const view = render(
    <TimeSeriesChart
      width={300}
      labels={['a', 'b', 'c']}
      series={[{ key: 's', label: 'S', data: [1, 2, 3] }]}
      animate={false}
    />,
  );
  try {
    assert.equal(runEscapeInterceptors(escapeEvent()), false, 'idle chart leaves Escape alone');

    const svg = view.container.querySelector('svg')!;
    arrowRight(svg as SVGSVGElement);

    let consumed = false;
    act(() => { consumed = runEscapeInterceptors(escapeEvent()); });
    assert.equal(consumed, true, 'an active crosshair consumes Escape at the seam');

    assert.equal(runEscapeInterceptors(escapeEvent()), false, 'cleared — the next Escape is the window’s');
  } finally {
    view.unmount();
  }
});
