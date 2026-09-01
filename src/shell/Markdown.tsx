import type { ReactNode } from 'react';

/**
 * Dependency-free Markdown renderer for help / documentation bodies.
 *
 * Supports the subset used by in-app articles: ATX headings (`##`–`####`),
 * **bold**, *italic*, `inline code`, fenced code blocks, [links](url), bullet
 * and numbered lists (with wrapped continuation lines), GitHub-style pipe
 * **tables**, `>` blockquote **callouts**, `---` rules, paragraphs, and image
 * syntax `![alt](src)` — which renders as a labelled *screenshot placeholder*
 * box (manual images may not exist yet). Unrecognised syntax degrades to plain
 * text, so author-written articles never break the page. No raw HTML is
 * interpreted.
 *
 * Everything here is line- and paragraph-shaped on purpose — there is no
 * nesting, because a regex renderer cannot have any. A body that needs more
 * than this subset (nested lists, task lists, footnotes, autolink literals)
 * wants `react-os-shell/markdown`, which runs a real CommonMark parser behind
 * an optional peer. This one exists so `react-os-shell/ui` can render prose
 * while importing nothing but React — see `src/ui/kit.ts` and the two tests
 * that hold that line.
 */

const INLINE_RE =
  /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <span key={key++} className="text-gray-400">
          [{m[1]}]
        </span>,
      );
    } else if (m[3] !== undefined) {
      out.push(
        <a
          key={key++}
          href={m[4]}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          {m[3]}
        </a>,
      );
    } else if (m[5] !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold text-gray-900">
          {m[5]}
        </strong>,
      );
    } else if (m[6] !== undefined) {
      out.push(
        // bg-gray-200, not bg-gray-100. Both are on the dark-mode allowlist in
        // ui.css, so neither looks wrong in review — but `bg-gray-100` remaps
        // to `--surface`, which is what `bg-white` remaps to as well, and every
        // host that draws this component draws it on a `bg-white` panel
        // (HelpCenter's own `<main>` among them). The chip was therefore the
        // exact colour of the surface behind it in dark mode: present, styled,
        // invisible. `bg-gray-200` is `--surface-raised`, one step up.
        <code
          key={key++}
          className="rounded bg-gray-200 px-1 py-0.5 font-mono text-[0.85em] text-gray-800"
        >
          {m[6]}
        </code>,
      );
    } else if (m[7] !== undefined) {
      out.push(<em key={key++}>{m[7]}</em>);
    }
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function ScreenshotPlaceholder({ alt }: { alt: string }) {
  const label = alt.replace(/^screenshot:\s*/i, '');
  return (
    <div className="my-1 flex items-start gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M3 6a1.5 1.5 0 0 1 1.5-1.5h1.1l.4-.9a1 1 0 0 1 .9-.6h6.2a1 1 0 0 1 .9.6l.4.9h1.1A1.5 1.5 0 0 1 18 6v8.5A1.5 1.5 0 0 1 16.5 16h-13A1.5 1.5 0 0 1 2 14.5V6Zm7.5 1.5a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
      </svg>
      <span className="text-xs text-gray-500">
        <span className="font-medium text-gray-600">Screenshot — </span>
        {label}
      </span>
    </div>
  );
}

/** Collect list items, merging wrapped continuation lines into their item. */
function collectItems(lines: string[], itemRe: RegExp): string[] {
  const items: string[] = [];
  for (const line of lines) {
    const m = itemRe.exec(line);
    if (m) {
      items.push(m[1]);
    } else if (items.length) {
      items[items.length - 1] += ' ' + line.trim();
    }
  }
  return items;
}

const splitCells = (line: string): string[] =>
  line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map(c => c.trim());

/** A pipe table: header row, a `---|---` separator, then body rows. */
function isTable(lines: string[]): boolean {
  return (
    lines.length >= 2 &&
    lines[0].includes('|') &&
    /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[1]) &&
    lines[1].includes('-')
  );
}

function renderTable(lines: string[], key: number): ReactNode {
  const header = splitCells(lines[0]);
  const rows = lines.slice(2).map(splitCells);
  return (
    <div key={key} className="my-1 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            {header.map((h, i) => (
              <th
                key={i}
                className="border-b border-gray-200 px-3 py-1.5 text-left font-semibold text-gray-700"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="even:bg-gray-50/50">
              {row.map((c, i) => (
                <td key={i} className="border-t border-gray-100 px-3 py-1.5 align-top text-gray-700">
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block.split('\n');
  const first = lines[0];

  const heading = /^(#{2,4})\s+(.*)$/.exec(first);
  if (heading && lines.length === 1) {
    const level = heading[1].length;
    const Tag = (`h${level}` as 'h2');
    const cls =
      level === 2
        ? 'mt-2 text-[13px] font-semibold uppercase tracking-wide text-gray-500'
        : level === 3
          ? 'mt-1 text-base font-semibold text-gray-900'
          : 'mt-1 text-sm font-semibold text-gray-900';
    return (
      <Tag key={key} className={cls}>
        {renderInline(heading[2])}
      </Tag>
    );
  }

  if (lines.length === 1 && /^---+$/.test(first)) {
    return <hr key={key} className="border-gray-200" />;
  }

  if (isTable(lines)) {
    return renderTable(lines, key);
  }

  if (/^>\s?/.test(first)) {
    const text = lines.map(l => l.replace(/^>\s?/, '')).join(' ');
    return (
      <div
        key={key}
        className="my-1 rounded-r-lg border-l-4 border-blue-300 bg-blue-50/60 px-3 py-2 text-gray-700"
      >
        {renderInline(text)}
      </div>
    );
  }

  const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(first);
  if (img && lines.length === 1) {
    return <ScreenshotPlaceholder key={key} alt={img[1]} />;
  }

  if (/^[-*]\s+/.test(first)) {
    const items = collectItems(lines, /^[-*]\s+(.*)$/);
    return (
      <ul key={key} className="list-disc space-y-1 pl-5 marker:text-gray-400">
        {items.map((it, j) => (
          <li key={j}>{renderInline(it)}</li>
        ))}
      </ul>
    );
  }

  const ordered = /^(\d+)\.\s+/.exec(first);
  if (ordered) {
    const items = collectItems(lines, /^\d+\.\s+(.*)$/);
    return (
      <ol
        key={key}
        start={Number(ordered[1])}
        className="list-decimal space-y-1 pl-5 marker:text-gray-400"
      >
        {items.map((it, j) => (
          <li key={j} className="pl-1">
            {renderInline(it)}
          </li>
        ))}
      </ol>
    );
  }

  return <p key={key}>{renderInline(lines.join(' '))}</p>;
}

/** A fenced code block: its info string and its lines, delimiters removed. */
interface Fence {
  lang: string;
  code: string;
}

/** A block in source order — a fence, or a paragraph-shaped run of text. */
type Block = { fence: Fence } | { text: string };

/** An opening or closing fence: three or more backticks or tildes alone on the
 *  line. The second capture is the info string — a language tag on an opener,
 *  which CommonMark forbids on a closer, and that is how the two are told
 *  apart without tracking which one we are looking for. */
const FENCE_RE = /^(`{3,}|~{3,})[ \t]*([^\s`]*)[ \t]*$/;

/**
 * Split the source into blocks, lifting fences out BEFORE anything is split on
 * blank lines.
 *
 * The order is the whole of the bug this fixes. Splitting on blank lines first
 * tore a fence that contained one into pieces, and every piece fell through to
 * the paragraph branch — which joins its lines with a space. A YAML block came
 * back as a single long line, its opening ``` read as an empty code span and
 * its language tag beginning another, with two bare backticks printed to the
 * reader. Fences are line-shaped, so they have to be found by walking lines.
 */
function splitBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let buf: string[] = [];

  /** Paragraph-split whatever plain text has accumulated, in source order. */
  const flush = () => {
    for (const para of buf.join('\n').split(/\n{2,}/)) {
      const text = para.replace(/\s+$/, '');
      if (text.trim() !== '') blocks.push({ text });
    }
    buf = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const open = FENCE_RE.exec(lines[i]);
    if (!open) {
      buf.push(lines[i]);
      continue;
    }
    flush();
    const [, marker, lang] = open;
    const code: string[] = [];
    for (i += 1; i < lines.length; i += 1) {
      const close = FENCE_RE.exec(lines[i]);
      const closes =
        close !== null &&
        close[1][0] === marker[0] &&
        close[1].length >= marker.length &&
        close[2] === '';
      if (closes) break;
      code.push(lines[i]);
    }
    // An unclosed fence runs to the end of the document. That is CommonMark's
    // rule, and it is also the kind one: in a live preview, a half-typed fence
    // shows the rest as code rather than folding it into a paragraph and
    // reflowing the page under the author's cursor.
    blocks.push({ fence: { lang, code: code.join('\n') } });
  }
  flush();
  return blocks;
}

function renderFence({ lang, code }: Fence, key: number): ReactNode {
  return (
    <pre
      key={key}
      // No syntax highlighting, deliberately: a highlighter costs more bytes
      // than this entire package's UI kit, in a component whose reason to
      // exist is importing nothing. The language is kept as a data attribute
      // so a host that wants highlighting can find these and add it itself.
      data-language={lang || undefined}
      className="my-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800"
    >
      <code>{code}</code>
    </pre>
  );
}

export interface MarkdownProps {
  children: string;
  className?: string;
}

export default function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={`space-y-3 text-sm leading-relaxed text-gray-700 ${className ?? ''}`.trim()}>
      {splitBlocks(children ?? '').map((block, i) =>
        'fence' in block ? renderFence(block.fence, i) : renderBlock(block.text, i),
      )}
    </div>
  );
}
