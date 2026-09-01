/**
 * AccessibleTable — the text equivalent a chart carries when its SVG is an
 * opaque leaf.
 *
 * `role="img"` makes an SVG a single node to assistive tech: descendants are
 * presentational, so the per-mark `<title>` elements the hierarchical charts
 * used to rely on were never exposed to anyone. `ChartFrame` offers a visible
 * table slot for the same obligation, but a chart cannot assume it is inside a
 * frame — so each chart whose data is otherwise pointer-only renders this,
 * visually hidden, right after its SVG. A screen reader walks a real table;
 * everyone else sees nothing.
 *
 * Internal to the chart family, deliberately unexported from the kit: a caller
 * who wants a VISIBLE table passes one to `ChartFrame`'s slot.
 */
export default function AccessibleTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>{head.map(label => <th key={label} scope="col">{label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i}>{cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
