import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

/**
 * The full Markdown renderer — CommonMark + GFM, behind its own subpath.
 *
 * ## Why this is not in the UI kit
 *
 * `react-os-shell/ui` promises to import nothing but React, and two checks
 * hold that line: `tests/uiEntryIsPeerFree.test.ts` walks the source graph and
 * `scripts/verify-dist.mjs` walks the built one (only the second catches a peer
 * arriving through a shared chunk). That promise is what lets the till, which
 * has no `@heroicons/react` installed at all, take the kit.
 *
 * The kit's `Markdown` was written under that constraint — a regex renderer,
 * because a regex was all it could afford. It is still there, still correct for
 * what it covers, and still what `HelpCenter` falls back to. But a regex cannot
 * nest, so it cannot grow tables inside list items, task lists, footnotes, or
 * anything else with structure, and the day arrived when a body needed more.
 *
 * So: a second entry, with a real parser, whose peers are OPTIONAL. A consumer
 * that never imports `react-os-shell/markdown` never installs react-markdown
 * and never pays a byte for it — the same bargain `react-os-shell/markup`
 * already strikes from the other direction. The package's `dependencies` stay
 * empty, which is the promise underneath all of the others.
 *
 * ## What is deliberately NOT here
 *
 * - **Syntax highlighting.** Shiki and Prism each cost more than this whole
 *   package. Code blocks are monospace with their own horizontal scroll, and
 *   the info string is carried through as `data-language` so a host that wants
 *   highlighting can add it without a fork.
 * - **`rehype-raw`.** Adding it would re-open raw HTML, and raw HTML in a body
 *   a customer typed is an XSS surface. The dialect below closes it instead.
 * - **A sanitiser.** Not needed, and worth stating so nobody adds one out of
 *   caution: no raw HTML is parsed, and react-markdown's default `urlTransform`
 *   neutralises `javascript:` URLs. There is no HTML string anywhere in this
 *   pipeline to sanitise — the output is React elements throughout.
 * - **MDX.** The input is a string a person or a service wrote, not a module.
 */

// ── Dialect ────────────────────────────────────────────────────────────────

/**
 * Four constructs disabled, each because a body that predates markdown would
 * otherwise render surprisingly. Every one of these was found in stored copy,
 * not imagined:
 *
 * - `codeIndented` — a pasted, quoted email is indented four spaces and would
 *   become a code block.
 * - `htmlFlow` / `htmlText` — `<John>` and `<script>` must render as the text
 *   they are. react-markdown DROPS raw-HTML nodes silently, so without this a
 *   name in angle brackets simply disappears from the message.
 * - `setextUnderline` — `Title` followed by `----` is a horizontal rule under a
 *   line of text far more often than it is a heading.
 *
 * Fenced ``` blocks and `<https://…>` autolinks are untouched.
 */
function remarkDialect(this: unknown) {
  const data = (this as { data: () => { micromarkExtensions?: unknown[] } }).data();
  (data.micromarkExtensions ??= []).push({
    disable: { null: ['codeIndented', 'htmlFlow', 'htmlText', 'setextUnderline'] },
  });
}

/**
 * The plugin lists, exported for a host assembling its own pipeline.
 *
 * `note` carries `remark-breaks`; `article` does not, and the difference is
 * about who wrote the text. A note is typed into a box, where pressing Return
 * means a line break. An article is authored markdown whose source is hard
 * wrapped at ~78 columns, where a single newline is a soft wrap and honouring
 * it would shred every paragraph.
 */
export const MARKDOWN_PLUGINS = {
  note: [remarkGfm, remarkBreaks, remarkDialect],
  article: [remarkGfm, remarkDialect],
} as const;

// ── Shared element renderers ───────────────────────────────────────────────

/**
 * Colours here are utility classes that `ui.css` REMAPS under
 * `[data-theme="dark"]` — this package's dark mode is not a Tailwind variant.
 * Two consequences worth carrying in your head when editing this file:
 *
 * 1. A class with no remap stays light-on-light. `tests/markdown.test.tsx`
 *    fails the build rather than let one through.
 * 2. `bg-gray-200`, never `bg-gray-100`, for anything drawn ON a panel:
 *    `bg-gray-100` remaps to `--surface`, and so does `bg-white`, so a chip
 *    using it is the exact colour of the surface behind it. It was invisible
 *    in dark mode in the kit renderer for a year.
 */
const linkRenderer: Components['a'] = ({ node: _n, ...props }) => (
  <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all" />
);

const codeRenderer: Components['code'] = ({ node: _n, ...props }) => (
  <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-[0.85em] text-gray-800" {...props} />
);

/**
 * `pre` un-chips the `code` inside it: one `code` renderer serves both inline
 * spans and block content, so the block case has to undo the chip's own
 * background, padding and size.
 */
const preRenderer = (extra: string): Components['pre'] =>
  ({ node: _n, ...props }) => (
    <pre
      className={
        `${extra} overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 font-mono text-xs ` +
        '[&>code]:bg-transparent [&>code]:p-0 [&>code]:[font-size:inherit]'
      }
      {...props}
    />
  );

const tableRenderers: Pick<Components, 'th' | 'td'> = {
  th: ({ node: _n, ...props }) => (
    <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold text-gray-700" {...props} />
  ),
  td: ({ node: _n, ...props }) => <td className="border border-gray-200 px-2 py-1 align-top" {...props} />,
};

// ── variant: note ──────────────────────────────────────────────────────────

/**
 * Timeline cards, message bodies, bug-report descriptions — anything a person
 * or a service TYPED, shown inside a card that has other things in it.
 *
 * Headings cap one step above body text. An author writing `# heading` in a
 * note means emphasis, not a document outline, and a 30px line inside a
 * timeline card reads as a rendering fault.
 */
const NOTE_COMPONENTS: Components = {
  a: linkRenderer,
  h1: ({ node: _n, ...props }) => <h1 className="text-base font-semibold text-gray-900" {...props} />,
  h2: ({ node: _n, ...props }) => <h2 className="text-sm font-semibold text-gray-900" {...props} />,
  h3: ({ node: _n, ...props }) => <h3 className="text-sm font-semibold text-gray-700" {...props} />,
  h4: ({ node: _n, ...props }) => <h4 className="text-sm font-semibold text-gray-700" {...props} />,
  h5: ({ node: _n, ...props }) => <h5 className="text-sm font-semibold text-gray-700" {...props} />,
  h6: ({ node: _n, ...props }) => <h6 className="text-sm font-semibold text-gray-700" {...props} />,
  ul: ({ node: _n, ...props }) => <ul className="list-disc pl-5" {...props} />,
  ol: ({ node: _n, ...props }) => <ol className="list-decimal pl-5" {...props} />,
  code: codeRenderer,
  pre: preRenderer('p-2'),
  blockquote: ({ node: _n, ...props }) => (
    <blockquote className="border-l-2 border-gray-300 pl-2.5 text-gray-600" {...props} />
  ),
  hr: ({ node: _n, ...props }) => <hr className="border-gray-200" {...props} />,
  table: ({ node: _n, ...props }) => (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse" {...props} />
    </div>
  ),
  ...tableRenderers,
  img: ({ node: _n, alt, ...props }) => (
    <img {...props} alt={alt ?? ''} loading="lazy" className="max-w-full max-h-64 rounded-lg border border-gray-200" />
  ),
};

/** The note variant's set, with `resolveImageSrc` wired the same way the
 *  article's is — a resolver that silently applied to one variant and not the
 *  other was a broken image with no signal. */
function noteComponents(resolveImageSrc?: (src: string) => string): Components {
  if (!resolveImageSrc) return NOTE_COMPONENTS;
  return {
    ...NOTE_COMPONENTS,
    img: ({ node: _n, src, alt, ...props }) => {
      const raw = typeof src === 'string' ? src : undefined;
      return (
        <img
          {...props}
          src={raw ? resolveImageSrc(raw) : raw}
          alt={alt ?? ''}
          loading="lazy"
          className="max-w-full max-h-64 rounded-lg border border-gray-200"
        />
      );
    },
  };
}

// ── variant: article ───────────────────────────────────────────────────────

/**
 * A screenshot that has not been uploaded yet shows a labelled box rather than
 * a broken-image icon: most seeded article screenshots do not exist, and a
 * broken icon per step reads as a bug where the box reads as intent.
 *
 * Spans, not divs — react-markdown puts a lone image inside a `<p>`.
 */
function ArticleImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const label = (alt ?? '').replace(/^screenshot:\s*/i, '');
  if (!src || failed) {
    return (
      <span className="my-3 flex items-start gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 6a1.5 1.5 0 0 1 1.5-1.5h1.1l.4-.9a1 1 0 0 1 .9-.6h6.2a1 1 0 0 1 .9.6l.4.9h1.1A1.5 1.5 0 0 1 18 6v8.5A1.5 1.5 0 0 1 16.5 16h-13A1.5 1.5 0 0 1 2 14.5V6Zm7.5 1.5a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
        </svg>
        <span className="text-xs text-gray-500">{label || 'Screenshot'}</span>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt ?? ''}
      loading="lazy"
      onError={() => setFailed(true)}
      className="my-3 block max-w-full rounded-lg border border-gray-200"
    />
  );
}

/**
 * Help articles and other authored documentation: full heading scale, airier
 * blocks, `>` styled as a callout rather than an email-quote bar, and a capped
 * measure so a wide window does not produce 200-character lines.
 */
function articleComponents(resolveImageSrc?: (src: string) => string): Components {
  return {
    a: linkRenderer,
    h1: ({ node: _n, ...props }) => (
      <h1 className="mt-6 mb-3 text-xl font-semibold text-gray-900 first:mt-0" {...props} />
    ),
    h2: ({ node: _n, ...props }) => (
      <h2 className="mt-6 mb-2.5 border-b border-gray-200 pb-1.5 text-lg font-semibold text-gray-900 first:mt-0" {...props} />
    ),
    h3: ({ node: _n, ...props }) => (
      <h3 className="mt-5 mb-2 text-base font-semibold text-gray-900 first:mt-0" {...props} />
    ),
    h4: ({ node: _n, ...props }) => (
      <h4 className="mt-4 mb-1.5 text-sm font-semibold text-gray-900 first:mt-0" {...props} />
    ),
    h5: ({ node: _n, ...props }) => (
      <h5 className="mt-4 mb-1.5 text-sm font-semibold text-gray-700 first:mt-0" {...props} />
    ),
    h6: ({ node: _n, ...props }) => (
      <h6 className="mt-4 mb-1.5 text-sm font-semibold text-gray-700 first:mt-0" {...props} />
    ),
    p: ({ node: _n, ...props }) => <p className="my-2.5 leading-relaxed" {...props} />,
    ul: ({ node: _n, ...props }) => <ul className="my-2.5 list-disc space-y-1 pl-5" {...props} />,
    ol: ({ node: _n, ...props }) => <ol className="my-2.5 list-decimal space-y-1 pl-5" {...props} />,
    // A numbered walkthrough has multi-paragraph steps (text, then a
    // screenshot); paragraphs inside an item stay tighter than the gap between
    // items, or the numbering stops reading as a sequence.
    li: ({ node: _n, ...props }) => <li className="leading-relaxed [&>p]:my-1" {...props} />,
    code: codeRenderer,
    pre: preRenderer('my-3 p-3'),
    blockquote: ({ node: _n, ...props }) => (
      <blockquote
        className="my-3 rounded-r-lg border-l-4 border-blue-400/60 bg-blue-50 px-3 py-2 text-gray-700 [&>p]:my-1"
        {...props}
      />
    ),
    hr: ({ node: _n, ...props }) => <hr className="my-4 border-gray-200" {...props} />,
    table: ({ node: _n, ...props }) => (
      <div className="my-3 overflow-x-auto">
        <table className="border-collapse text-sm" {...props} />
      </div>
    ),
    ...tableRenderers,
    img: ({ node: _n, src, alt }) => {
      const raw = typeof src === 'string' ? src : undefined;
      return <ArticleImage src={raw && resolveImageSrc ? resolveImageSrc(raw) : raw} alt={alt} />;
    },
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export type MarkdownVariant = 'note' | 'article';

export interface MarkdownProps {
  /** The markdown source. */
  children: string;
  /**
   * `note` (default) — typed copy inside a card: capped headings, single
   * newlines honoured as line breaks, tight blocks.
   * `article` — authored documentation: full heading scale, soft wraps, callout
   * blockquotes, screenshot placeholders, a capped measure.
   */
  variant?: MarkdownVariant;
  /**
   * Collapse to ~6 text lines with a fade. The "Show more" control belongs to
   * the caller; this only clamps. The fade appears only when the clamped
   * content actually OVERFLOWS, measured after layout — a note that is long in
   * characters but short on screen would otherwise get a fade under nothing.
   *
   * Needs `react-os-shell/ui.css` for `.rosmd-clamp` / `.rosmd-fade`.
   */
  clamp?: boolean;
  /**
   * Rewrite a relative image `src` before it is fetched. Article bodies
   * reference screenshots by a repo-relative path that only the host knows how
   * to serve.
   */
  resolveImageSrc?: (src: string) => string;
  /** Override individual element renderers. Merged over the variant's set. */
  components?: Partial<Components>;
  className?: string;
}

/**
 * Render markdown as React elements.
 *
 * No HTML string is produced at any point, and no raw HTML is parsed, so there
 * is nothing here to sanitise — see the note at the top of this file before
 * reaching for DOMPurify.
 */
function Markdown({
  children,
  variant = 'note',
  clamp = false,
  resolveImageSrc,
  components,
  className = '',
}: MarkdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!clamp || !el) {
      setOverflowing(false);
      return;
    }
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    // A ResizeObserver rather than a one-off measure: the same note reflows
    // when its window is resized, and a fade that was correct at mount is
    // wrong the moment it is.
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clamp, children]);

  const resolved = useMemo<Components>(
    () => ({
      ...(variant === 'article' ? articleComponents(resolveImageSrc) : noteComponents(resolveImageSrc)),
      ...components,
    }),
    [variant, resolveImageSrc, components],
  );

  // `className` wins over the variant's own ink and type size.
  //
  // Both are ordinary utilities on the same element, so the one that wins is
  // decided by the order Tailwind emits them, not by the order they appear in
  // the attribute — a host asking for `text-green-900` on a green panel would
  // be gambling. The alternative is an important utility at every call site,
  // and the two syntaxes for that (v3's `!text-green-900`, v4's
  // `text-green-900!`) are each silently INERT in the other version, which is
  // a bad thing to ask a caller to get right for a colour.
  //
  // So: a host that names one simply gets it.
  const named = ` ${className} `;
  const ink = /\stext-(?:[a-z]+-\d{2,3}(?:\/\d+)?|black|white|inherit)\s/.test(named)
    ? ''
    : 'text-gray-800';
  const size = /\stext-(?:xs|sm|base|lg|[2-9]?xl|\[[^\]]+\])\s/.test(named) ? '' : 'text-sm';

  return (
    <div
      ref={ref}
      className={[
        variant === 'article' ? 'max-w-3xl break-words' : 'break-words space-y-1.5',
        size,
        ink,
        clamp ? 'rosmd-clamp' : '',
        clamp && overflowing ? 'rosmd-fade' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS[variant] as never} components={resolved}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

const MemoMarkdown = memo(Markdown);

export { MemoMarkdown as Markdown };
export default MemoMarkdown;

export type { Components as MarkdownComponents } from 'react-markdown';

/** Re-exported so a host can render a placeholder in its own layout. */
export type MarkdownNode = ReactNode;
