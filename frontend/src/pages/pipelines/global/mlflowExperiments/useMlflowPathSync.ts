import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  buildIframePathQuery,
  buildParentPathQuery,
  getIframeHashPathQuery,
  MLFLOW_DEFAULT_PATH,
  MLFLOW_EXPERIMENTS_ROUTE,
  normalizePathQuery,
  patchIframeHistory,
  WORKSPACE_QUERY_PARAM,
} from '#~/routes/pipelines/mlflowExperiments';

export type MlflowPathSyncOptions = {
  /** The ODH base route to strip/prepend (e.g. '/develop-train/experiments-mlflow') */
  baseRoute?: string;
  /** The default MLflow hash path (e.g. '/experiments' or '/prompts') */
  defaultPath?: string;
  /** Pre-resolved namespace; when provided the hook skips reading the workspace query param */
  namespace?: string;
};

export const useMlflowPathSync = (
  options?: MlflowPathSyncOptions,
  ref?: React.ForwardedRef<HTMLIFrameElement>,
): { iframeRef: React.RefCallback<HTMLIFrameElement>; initIframeSrc: string } => {
  const {
    baseRoute = MLFLOW_EXPERIMENTS_ROUTE,
    defaultPath = MLFLOW_DEFAULT_PATH,
    namespace: namespaceProp,
  } = options ?? {};

  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [searchParams] = useSearchParams();
  const namespace = namespaceProp ?? searchParams.get(WORKSPACE_QUERY_PARAM) ?? undefined;
  const parentPathQuery = buildParentPathQuery(pathname, search, baseRoute, defaultPath);
  const initIframeSrc = buildIframePathQuery(defaultPath, namespace);
  const syncLock = React.useRef(false);
  const internalIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const iframeRef = React.useCallback(
    (node: HTMLIFrameElement | null) => {
      internalIframeRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        // eslint-disable-next-line no-param-reassign
        ref.current = node;
      }
    },
    [ref],
  );

  // Sync parent to iframe
  React.useEffect(() => {
    if (!syncLock.current) {
      const iframe = internalIframeRef.current;
      if (iframe?.contentWindow) {
        const iframePathQuery = getIframeHashPathQuery(iframe);
        const isSynced =
          normalizePathQuery(iframePathQuery) === normalizePathQuery(parentPathQuery);
        if (!isSynced) {
          iframe.contentWindow.location.replace(buildIframePathQuery(parentPathQuery));
        }
      }
    } else {
      syncLock.current = false;
    }
  }, [parentPathQuery]);

  // Sync iframe to parent
  React.useEffect(() => {
    const iframe = internalIframeRef.current;
    if (!iframe) {
      return undefined;
    }
    let cleanupPatch: (() => void) | undefined;
    const syncIframeToParent = (histPush: boolean) => {
      const iframePath = getIframeHashPathQuery(iframe);
      if (iframePath && normalizePathQuery(iframePath) !== normalizePathQuery(parentPathQuery)) {
        syncLock.current = true;
        navigate(`${baseRoute}${iframePath}`, { replace: !histPush });
      }
    };

    const onLoad = () => {
      syncIframeToParent(false);
      cleanupPatch?.();
      cleanupPatch = patchIframeHistory(iframe, syncIframeToParent);
    };
    cleanupPatch = patchIframeHistory(iframe, syncIframeToParent);
    iframe.addEventListener('load', onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
      cleanupPatch?.();
    };
  }, [navigate, parentPathQuery, baseRoute]);

  return { iframeRef, initIframeSrc };
};
