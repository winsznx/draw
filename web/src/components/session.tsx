'use client';

import { QueryClient, QueryClientProvider, keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { AccessCodeNeeded, ActionError, fetchView, postAction, postSignature, rememberAccessCode, type SignatureRequest } from '@/lib/api';
import { signHash } from '@/lib/keys';
import type { Role, View } from '@/lib/types';

const ROLES: readonly Role[] = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
const POLL_MS = 5000;

// ---------------------------------------------------------------- seat
// The party this browser acts as. Chosen during onboarding and kept on this
// device, the way a wallet remembers its connected account.
const SEAT_KEY = 'draw-seat';
const seatListeners = new Set<() => void>();

function readSeat(): Role | null {
  try {
    const value = window.localStorage.getItem(SEAT_KEY);
    return ROLES.includes(value as Role) ? (value as Role) : null;
  } catch {
    return null;
  }
}

function writeSeat(role: Role | null): void {
  try {
    if (role) window.localStorage.setItem(SEAT_KEY, role);
    else window.localStorage.removeItem(SEAT_KEY);
  } catch {
    // Storage is blocked. The seat then lasts for this page only.
  }
  memorySeat = role;
  seatListeners.forEach((notify) => notify());
}

let memorySeat: Role | null = null;
const subscribeSeat = (notify: () => void) => {
  seatListeners.add(notify);
  const onStorage = (event: StorageEvent) => event.key === SEAT_KEY && notify();
  window.addEventListener('storage', onStorage);
  return () => {
    seatListeners.delete(notify);
    window.removeEventListener('storage', onStorage);
  };
};

// `undefined` while rendering on the server, before this browser is known.
export function useSeat(): Role | null | undefined {
  return useSyncExternalStore(subscribeSeat, () => readSeat() ?? memorySeat, () => undefined);
}

export const takeSeat = (role: Role): void => writeSeat(role);
export const leaveSeat = (): void => writeSeat(null);

// ---------------------------------------------------------------- ledger view
export function useView(role: Role | null | undefined) {
  return useQuery({
    queryKey: ['view', role],
    queryFn: ({ signal }) => fetchView(role as Role, signal),
    enabled: Boolean(role),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------- actions
export interface Toast {
  id: number;
  message: string;
  detail?: string;
  error: boolean;
}

interface Actions {
  busy: string | null;
  act: (name: string, body: Record<string, unknown>, key?: string) => Promise<boolean>;
  toasts: Toast[];
  dismiss: (id: number) => void;
  notify: (message: string, error?: boolean, detail?: string) => void;
  signRequest: SignatureRequest | null;
  answerSign: (approve: boolean) => void;
  accessPrompt: boolean;
  answerAccess: (code: string | null) => void;
}

const ActionsContext = createContext<Actions | null>(null);

function ActionsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [signRequest, setSignRequest] = useState<SignatureRequest | null>(null);
  const [accessPrompt, setAccessPrompt] = useState(false);
  const signDecision = useRef<((approve: boolean) => void) | null>(null);
  const accessDecision = useRef<((code: string | null) => void) | null>(null);
  const nextId = useRef(0);

  const notify = useCallback((message: string, error = false, detail?: string) => {
    const id = (nextId.current += 1);
    setToasts((list) => [...list.slice(-2), { id, message, error, detail }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), error ? 15000 : 6000);
  }, []);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const askToSign = useCallback((request: SignatureRequest) => new Promise<boolean>((resolve) => {
    signDecision.current = resolve;
    setSignRequest(request);
  }), []);

  const answerSign = useCallback((approve: boolean) => {
    signDecision.current?.(approve);
    signDecision.current = null;
    setSignRequest(null);
  }, []);

  const askForAccess = useCallback(() => new Promise<string | null>((resolve) => {
    accessDecision.current = resolve;
    setAccessPrompt(true);
  }), []);

  const answerAccess = useCallback((code: string | null) => {
    accessDecision.current?.(code);
    accessDecision.current = null;
    setAccessPrompt(false);
  }, []);

  const act = useCallback(async (name: string, body: Record<string, unknown>, key = name): Promise<boolean> => {
    setBusy(key);
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          let reply = await postAction(name, body);
          // With browser keys the server pauses each time the ledger needs a signature.
          while (reply.kind === 'sign') {
            const { request } = reply;
            const view = queryClient.getQueryData<View>(['view', request.role]);
            const tag = view?.session ? view.sessionTag : null;
            const approved = await askToSign(request);
            if (!approved || !view || !tag) {
              reply = await postSignature(request.id, { cancel: true });
              continue;
            }
            reply = await postSignature(request.id, { signature: await signHash(view.network, tag, request.role, request.hash) });
          }
          notify(reply.message);
          return true;
        } catch (error) {
          if (!(error instanceof AccessCodeNeeded) || attempt > 0) throw error;
          const code = await askForAccess();
          if (!code) throw new ActionError('Nothing was submitted. Actions on this demo need an access code.');
          rememberAccessCode(code);
        }
      }
    } catch (error) {
      const failure = error instanceof ActionError ? error : new ActionError('The action failed.');
      notify(failure.message, true, failure.detail);
      return false;
    } finally {
      setBusy(null);
      await queryClient.invalidateQueries({ queryKey: ['view'] });
    }
  }, [askForAccess, askToSign, notify, queryClient]);

  const value = useMemo(
    () => ({ busy, act, toasts, dismiss, notify, signRequest, answerSign, accessPrompt, answerAccess }),
    [busy, act, toasts, dismiss, notify, signRequest, answerSign, accessPrompt, answerAccess],
  );
  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

export function useActions(): Actions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useActions outside Providers');
  return actions;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 2000, retry: 1, refetchOnWindowFocus: true } },
  }));
  return (
    <QueryClientProvider client={client}>
      <ActionsProvider>{children}</ActionsProvider>
    </QueryClientProvider>
  );
}
