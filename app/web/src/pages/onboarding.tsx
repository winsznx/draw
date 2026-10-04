import { useState, type ReactElement } from 'react';

import { ActionError, accessHeaders } from '../api';
import { ActionButton, Empty } from '../components';
import { ROLE_NAME } from '../format';
import { createKey, signHash } from '../keys';
import { useApp } from '../state';
import type { ViewNeedsFund, ViewNotOnboarded } from '../types';

// Sign-up: the key is generated here, the node builds the onboarding
// transactions for its public key, and this browser signs them.
export function Onboarding({ view }: { view: ViewNotOnboarded }): ReactElement {
  const { act } = useApp();
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const isAdmin = view.role === 'admin';

  async function createAccount() {
    setWorking(true);
    setProblem(null);
    try {
      const publicKeySpki = await createKey(view.network, view.sessionTag, view.role);
      const response = await fetch('/api/actions/onboardstart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...accessHeaders() },
        body: JSON.stringify({ role: view.role, publicKeySpki }),
      });
      const started = (await response.json()) as { multiHash?: string; error?: string; detail?: string };
      if (!response.ok || !started.multiHash) throw new ActionError(started.error ?? 'Could not start creating the account.', started.detail);
      const signature = await signHash(view.network, view.sessionTag, view.role, started.multiHash);
      await act('onboardfinish', { role: view.role, signature }, 'onboard');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Creating the account failed.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <Empty title={isAdmin ? 'Create the fund admin account' : `Create ${ROLE_NAME[view.role]}'s account`}>
      <p>
        This browser generates a signing key and registers a party for it on {view.network}. The key never leaves this browser.
        Every action this account takes is signed here, so the DRAW server cannot act for you.
      </p>
      <button type="button" className="btn" disabled={working} onClick={() => void createAccount()}>
        {working ? 'Creating the account…' : 'Create account'}
      </button>
      {problem && <p className="form-error">{problem}</p>}
    </Empty>
  );
}

export function NeedsFund({ view }: { view: ViewNeedsFund }): ReactElement {
  const [name, setName] = useState('Example Ventures I (demo)');
  if (view.role !== 'admin') {
    return (
      <Empty title="Account ready">
        <p>The fund has not been created yet. Once the fund admin creates it and invites you, the invitation appears here.</p>
      </Empty>
    );
  }
  return (
    <Empty title="Create the fund">
      <p>The fund is a contract only the fund admin signs. You will be asked to sign it with your key.</p>
      <p><input aria-label="Fund name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} /></p>
      <ActionButton name="fund" body={{ fundName: name }}>Create fund</ActionButton>
    </Empty>
  );
}
