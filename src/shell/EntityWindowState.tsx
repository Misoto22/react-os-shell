import { type ReactNode } from 'react';
import Button from '../forms/Button';
import { entityFetchStatus } from './entityFetchPolicy';
import LoadingSpinner from './Spinner';
import Result from './Result';

export interface EntityWindowStateProps<T> extends EntityWindowFallbackProps {
  entity: T | null | undefined;
  children: (entity: T) => ReactNode;
}

export interface EntityWindowFallbackProps {
  isPending: boolean;
  isFetching: boolean;
  /**
   * Whether the query is switched on. FALSE for a window whose detail fetch is
   * deliberately skipped — a `new-` draft, a duplicate, or a host that never
   * called `setShellApiClient`.
   *
   * This has to be passed, because a DISABLED TanStack query is
   * `status: 'pending'` / `fetchStatus: 'idle'` forever, so `isPending` alone
   * reads as "still loading" for a request that will never be made — and the
   * window sits on a spinner it can never leave. `isLoading` (`isPending &&
   * isFetching`) is the pair that already accounts for this, which is why the
   * old inline check did not have the bug.
   */
  enabled?: boolean;
  error: unknown;
  onRetry: () => void;
}

const FILL_CLASS = 'flex-1 min-h-0';

export function EntityWindowLoading() {
  return <LoadingSpinner label="Loading record…" padding="" className={FILL_CLASS} />;
}

/** A nullable snapshot means the caller has no cache seed. */
export function normaliseEntitySnapshot<T>(snapshot: T | null | undefined): T | undefined {
  return snapshot ?? undefined;
}

/**
 * The no-data half of an entity window: what to show when there is no entity
 * to render yet, or never will be. Split out from `EntityWindowState` because
 * a `rendersOwnModal` entry supplies its own Modal only once it HAS an entity,
 * so these states need a modal of their own to live inside.
 */
export function EntityWindowFallback({
  isPending,
  isFetching,
  enabled = true,
  error,
  onRetry,
}: EntityWindowFallbackProps) {
  if (isFetching || (isPending && enabled)) return <EntityWindowLoading />;

  if (error) {
    const status = entityFetchStatus(error);
    if (status === 401) {
      return (
        <Result
          status="warning"
          title="Sign in required"
          subTitle="Your session may have expired. Sign in again to open this record."
          className={FILL_CLASS}
        />
      );
    }
    if (status === 403) {
      return <Result status="403" className={FILL_CLASS} />;
    }
    if (status === 404 || status === 410) {
      return <Result status="404" title="Record not found" className={FILL_CLASS} />;
    }
    const canRetry = status == null || status === 408 || status === 429 || status >= 500;
    return (
      <Result
        status="500"
        title="Couldn't load record"
        subTitle={canRetry ? 'Check your connection and try again.' : 'The server rejected this request.'}
        extra={canRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button> : undefined}
        className={FILL_CLASS}
      />
    );
  }

  return <Result status="404" title="Record not found" className={FILL_CLASS} />;
}

/**
 * Owns the no-data states for an entity window. Existing data always wins so
 * background refreshes never replace a usable detail with transient chrome.
 */
export default function EntityWindowState<T>({
  entity,
  children,
  ...fallback
}: EntityWindowStateProps<T>) {
  if (entity != null) return <>{children(entity)}</>;
  return <EntityWindowFallback {...fallback} />;
}
