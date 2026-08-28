import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Button from './Button';
import MediaUploadField from './MediaUploadField';
import BrandMark, { type BrandMarkSlot, type BrandMarkSurface } from './BrandMark';

export interface BrandAssetPreview {
  label: string;
  slot: BrandMarkSlot;
  surface?: BrandMarkSurface;
}

export interface BrandAssetEditorProps {
  committedUrl?: string | null;
  subjectName: string;
  assetName: string;
  onSave: (file: File) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  accept?: string;
  acceptHint?: string;
  maxBytes?: number;
  previews?: BrandAssetPreview[];
  disabled?: boolean;
}

function byteLimitMessage(maxBytes: number) {
  return `Image must be smaller than ${maxBytes.toLocaleString()} bytes.`;
}

function actionNoun(assetName: string) {
  const words = assetName.trim().toLocaleLowerCase().split(/\s+/);
  return words.at(-1) || 'image';
}

/**
 * Shared staged-upload surface for portal branding. Network and persistence
 * remain consumer-owned through onSave/onRemove; validation, preview and file
 * lifecycle are identical everywhere.
 */
export default function BrandAssetEditor({
  committedUrl,
  subjectName,
  assetName,
  onSave,
  onRemove,
  accept = 'image/png,image/x-icon,image/svg+xml,image/jpeg,image/webp',
  acceptHint = 'PNG · ICO · SVG · JPG · WEBP',
  maxBytes = 5 * 1024 * 1024,
  previews = [],
  disabled = false,
}: BrandAssetEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedUrl, setStagedUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const noun = actionNoun(assetName);
  const visibleUrl = stagedUrl || committedUrl || '';

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const discardObjectUrl = () => {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  };

  const stage = (file?: File) => {
    if (!file || disabled) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > maxBytes) {
      setError(byteLimitMessage(maxBytes));
      return;
    }
    discardObjectUrl();
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setStagedFile(file);
    setStagedUrl(nextUrl);
    setError('');
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    stage(event.target.files?.[0]);
    event.target.value = '';
  };

  const save = async () => {
    if (!stagedFile || disabled || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave(stagedFile);
      discardObjectUrl();
      setStagedFile(null);
      setStagedUrl('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not save ${noun}.`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (disabled || removing) return;
    if (stagedFile) {
      discardObjectUrl();
      setStagedFile(null);
      setStagedUrl('');
      setError('');
      return;
    }
    if (!committedUrl) return;
    setRemoving(true);
    setError('');
    try {
      await onRemove();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not remove ${noun}.`);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section aria-label={`${assetName} for ${subjectName}`} className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <MediaUploadField
          value={visibleUrl}
          onChange={() => {}}
          onPick={file => file ? stage(file) : inputRef.current?.click()}
          label={assetName}
          hint={error || `Used for ${subjectName}.`}
          error={error || undefined}
          accept={accept}
          acceptHint={acceptHint}
          fit="contain"
          height={180}
          allowRemove={false}
          busy={saving || removing}
          disabled={disabled}
        />
        <input ref={inputRef} type="file" accept={accept} hidden onChange={onInput} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={save} disabled={!stagedFile || disabled} loading={saving}>
            Save {noun}
          </Button>
          {(stagedFile || committedUrl) && (
            <Button variant="ghost-danger" onClick={remove} disabled={disabled} loading={removing}>
              {stagedFile ? 'Discard change' : `Remove ${noun}`}
            </Button>
          )}
        </div>
      </div>
      {previews.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4" aria-label={`${assetName} previews`}>
          <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
          <div className="mt-3 grid gap-3">
            {previews.map(preview => (
              <div
                key={`${preview.label}-${preview.slot}-${preview.surface ?? 'light'}`}
                data-brand-preview
                className={[
                  'flex items-center gap-3 rounded-md border border-gray-200 p-3',
                  preview.surface === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
                ].join(' ')}
              >
                <BrandMark
                  src={visibleUrl}
                  alt={`${subjectName} ${assetName}`}
                  slot={preview.slot}
                  surface={preview.surface}
                />
                <span className="text-sm">{preview.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
