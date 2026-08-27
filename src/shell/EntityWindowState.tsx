import { type ReactNode } from 'react';
import Button from '../forms/Button';
import { entityFetchStatus } from './entityFetchPolicy';
import LoadingSpinner from './Spinner';
import Result from './Result';

export interface EntityWindowStateProps<T> {
  entity: T | null | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  children: (entity: T) => ReactNode;
}

export function EntityWindowLoading() {
  return (
    <LoadingSpinner
      label="Loading record…"
      padding=""
      className="flex-1 min-h-0"
    />
  );
}

/** A nullable snapshot means the caller has no cache seed. */
export function normaliseEntitySnapshot<T>(snapshot: T | null | undefined): T | undefined {
  return snapshot ?? undefined;
}

/**
 * Owns the no-data states for an entity window. Existing data always wins so
 * background refreshes never replace a usable detail with transient chrome.
 */
export default function EntityWindowState<T>({
  entity,
  isPending,
  isFetching,
  error,
  onRetry,
  children,
}: EntityWindowStateProps<T>) {
  const fillClass = 'flex-1 min-h-0';
  if (entity != null) return <>{children(entity)}</>;

  if (isPending || isFetching) {
    return <EntityWindowLoading />;
  }

  if (error) {
    const status = entityFetchStatus(error);
    if (status === 401) {
      return (
        <Result
          status="warning"
          title="Sign in required"
          subTitle="Your session may have expired. Sign in again to open this record."
          className={fillClass}
        />
      );
    }
    if (status === 403) {
      return <Result status="403" className={fillClass} />;
    }
    if (status === 404 || status === 410) {
      return <Result status="404" title="Record not found" className={fillClass} />;
    }
    const canRetry = status == null || status === 408 || status === 429 || status >= 500;
    return (
      <Result
        status="500"
        title="Couldn't load record"
        subTitle={canRetry ? 'Check your connection and try again.' : 'The server rejected this request.'}
        extra={canRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button> : undefined}
        className={fillClass}
      />
    );
  }

  return <Result status="404" title="Record not found" className={fillClass} />;
}
