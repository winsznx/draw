import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { AccessCodeNeeded, ActionError, fetchView, postAction, postSignature, rememberAccessCode, type SignatureRequest } from './api';
import { signHash } from './keys';
import type { Role, View } from './types';

const ROLES: Role[] = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
const POLL_MS = 5000;

// ---------------------------------------------------------------- hash route
function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash);
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

export const href = (...parts: string[]): string => `#/${parts.map(encodeURIComponent).join('/')}`;

export function navigate(...parts: string[]) {
  window.location.hash = href(...parts);
}

// ---------------------------------------------------------------- app state
export interface Toast {
  message: string;
  detail?: string;
  error: boolean;
}

interface AppState {
  role: Role;
  setRole: (role: Role) => void;
  view: View | null;
  loadError: string | null;
  busy: string | null;
  toast: Toast | null;
  dismissToast: () => void;
  act: (name: string, body: Record<string, unknown>, key?: string) => Promise<boolean>;
  signRequest: SignatureRequest | null;
  answerSign: (approve: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

function initialRole(): Role {
  const requested = new URLSearchParams(window.location.search).get('as');
  return ROLES.includes(requested as Role) ? (requested as Role) : 'admin';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(initialRole);
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [version, setVersion] = useState(0);
  const [signRequest, setSignRequest] = useState<SignatureRequest | null>(null);
  const signDecision = useRef<((approve: boolean) => void) | null>(null);
  const latestView = useRef<View | null>(null);

  // Ledger reads for the selected party, refreshed on a timer and after actions.
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (document.hidden) return;
      fetchView(role, controller.signal)
        .then((next) => {
          latestView.current = next;
          setView(next);
          setLoadError(null);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setLoadError(error instanceof Error ? error.message : 'Could not read the ledger.');
        });
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [role, version]);

  // Switching role keeps the page, so the same URL is read with a different
  // party's ledger login. That is how LP B opening LP A's notice is shown.
  const setRole = useCallback((next: Role) => {
    const url = new URL(window.location.href);
    url.searchParams.set('as', next);
    window.history.replaceState(null, '', url);
    setView(null);
    setRoleState(next);
  }, []);

  // Asks the user to approve one signature. Resolves when they choose.
  const askToSign = useCallback((request: SignatureRequest) => new Promise<boolean>((resolve) => {
    signDecision.current = resolve;
    setSignRequest(request);
  }), []);

  const answerSign = useCallback((approve: boolean) => {
    signDecision.current?.(approve);
    signDecision.current = null;
    setSignRequest(null);
  }, []);

  const act = useCallback(async (name: string, body: Record<string, unknown>, key = name) => {
    setBusy(key);
    try {
      let reply = await postAction(name, body);
      // With browser keys the server pauses each time the ledger needs a signature.
      while (reply.kind === 'sign') {
        const { request } = reply;
        const current = latestView.current;
        const tag = current?.session ? current.sessionTag : null;
        const approved = await askToSign(request);
        if (!approved || !current || !tag) {
          reply = await postSignature(request.id, { cancel: true });
          continue;
        }
        const signature = await signHash(current.network, tag, request.role, request.hash);
        reply = await postSignature(request.id, { signature });
      }
      setToast({ message: reply.message, error: false });
      return true;
    } catch (error) {
      if (error instanceof AccessCodeNeeded) {
        const code = window.prompt('This demo is read-only for visitors. Enter the access code to take actions:');
        if (code) rememberAccessCode(code.trim());
        setToast({ message: code ? 'Access code saved. Try the action again.' : error.message, error: !code });
        return false;
      }
      const failure = error instanceof ActionError ? error : new ActionError('The action failed.');
      setToast({ message: failure.message, detail: failure.detail, error: true });
      return false;
    } finally {
      setBusy(null);
      setVersion((v) => v + 1);
    }
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({ role, setRole, view, loadError, busy, toast, dismissToast, act, signRequest, answerSign }),
    [role, setRole, view, loadError, busy, toast, dismissToast, act, signRequest, answerSign],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('useApp outside AppProvider');
  return state;
}
