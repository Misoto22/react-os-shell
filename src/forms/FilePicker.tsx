/**
 * FilePicker — choose files and list them. It does NOT upload.
 *
 * That is the entire design. An uploader that owns transport has to own retry,
 * progress, cancellation, auth and the endpoint, and every consumer ends up
 * fighting a piece of it. This hands the caller a `File[]` and stops; the form
 * submits them however it already submits everything else.
 *
 * Rejections are reported, never silent. A file dropped for being too large or
 * the wrong type is the case where a user is most certain they did the thing
 * and most confused that nothing happened.
 */
import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { mediaFileName } from './mediaShared';

export interface FilePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** `accept` for the native picker, e.g. "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
  /** Rejected above this, with the reason shown. */
  maxSizeBytes?: number;
  /** Rejected beyond this many files total. */
  maxFiles?: number;
  disabled?: boolean;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}

const humanSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FilePicker({
  files, onChange, accept, multiple = true, maxSizeBytes, maxFiles,
  disabled = false, label, hint, error, className = '',
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const add = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const reasons: string[] = [];
    const accepted: File[] = [];

    for (const file of Array.from(incoming)) {
      if (maxSizeBytes != null && file.size > maxSizeBytes) {
        reasons.push(`${mediaFileName(file.name)} is ${humanSize(file.size)} — the limit is ${humanSize(maxSizeBytes)}`);
        continue;
      }
      if (maxFiles != null && files.length + accepted.length >= maxFiles) {
        reasons.push(`${mediaFileName(file.name)} was not added — ${maxFiles} files is the limit`);
        continue;
      }
      accepted.push(file);
    }

    setRejected(reasons);
    if (accepted.length) onChange(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
    // Reset the native input so re-picking the SAME file fires change again —
    // without this, removing a file and re-adding it appears to do nothing.
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) add(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}

      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          'rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white',
          disabled ? 'opacity-60' : '',
        ].filter(Boolean).join(' ')}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={e => add(e.target.files)}
          className="sr-only"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed"
        >
          Choose {multiple ? 'files' : 'a file'}
        </button>
        <span className="text-sm text-gray-500"> or drag them here</span>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>

      {files.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-gray-800" title={file.name}>{file.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-gray-500">{humanSize(file.size)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => { setRejected([]); onChange(files.filter((_, j) => j !== i)); }}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l8 8M14 6l-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {rejected.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5">
          {rejected.map(reason => <li key={reason} className="text-xs text-red-600">{reason}</li>)}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
