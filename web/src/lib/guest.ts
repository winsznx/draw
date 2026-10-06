// The view of an LP that signed in with its own HackCanton login. Every
// record here comes from that party's own ledger reads, made from this
// browser with its own token. DRAW's server contributes only which demo fund
// this browser is in and its own records for each notice: the read-back
// receipt and the steps it logged.
import { businessStatus, classifyPayments, obligationOutcome } from '../../../scripts/demo/lib/reconcile.mjs';
import type { AllocationContract, ObligationContract } from '../../../scripts/demo/lib/reconcile.mjs';

import { ActionError, getJson } from './api';
import { SignedOut, activeContracts, exercise, identity, walletAllocate, walletBalance, walletTap, walletWithdraw } from './hackcanton';
import type { AllocationRequestView, Call, GuestTour, LedgerState, Obligation, Receipt, SignInConfig, TimelineEntry, Totals, View, ViewNoSession, ViewWithSession } from './types';

interface InstrumentId { admin: string; id: string }

interface ObligationPayload {
  admin: string;
  lp: string;
  fundId: string;
  fundName: string;
  callId: string;
  obligationRef: string;
  amountDue: string;
  scenarioAmount: string;
  instrumentId: InstrumentId;
  dueAt: string;
  state: LedgerState;
  reviewNote: string | null;
  settlement: { settledAfterDue: boolean } | null;
}

interface InvitationPayload { admin: string; lp: string; fundId: string; fundName: string; committedScenarioAmount: string }
interface CommitmentPayload extends InvitationPayload { calledScenarioAmount: string }

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

async function fetchRecord(ref: string, signal?: AbortSignal): Promise<{ receipt: Receipt | null; timeline: TimelineEntry[] }> {
  return getJson(`/api/record?ref=${encodeURIComponent(ref)}`, signal);
}

function totalsOf(list: Obligation[]): Totals {
  const funded = list.filter((r) => r.status === 'funded');
  return {
    calledUsd: sum(list.map((r) => r.scenarioUsd)),
    fundedUsd: sum(funded.map((r) => r.scenarioUsd)),
    unresolvedUsd: sum(list.filter((r) => r.status !== 'funded' && r.status !== 'waived').map((r) => r.scenarioUsd)),
    waivedUsd: sum(list.filter((r) => r.status === 'waived').map((r) => r.scenarioUsd)),
    fundedUnits: sum(funded.map((r) => r.units)),
    fundedCount: funded.length,
    count: list.length,
  };
}

// Which demo fund this browser is in, and which signed-in party joined it.
export async function fetchGuestTour(signal?: AbortSignal): Promise<GuestTour | ViewNoSession> {
  return getJson('/api/view?role=guest', signal);
}

export async function fetchGuestView(signal?: AbortSignal): Promise<View> {
  const tour = await fetchGuestTour(signal);
  if (!tour.signIn) throw new ActionError('Signing in with HackCanton is not turned on for this demo.');
  if (!tour.session) return tour;
  const config = tour.signIn;
  const me = identity();
  const base = { ...tour, role: 'guest' as const, sessionTag: null, fingerprint: null };
  if (!me) return { ...base, session: true, onboarded: false, sessionTag: '', fingerprint: null };
  const queriedAs = { userId: me.userId, party: me.party };
  if (!tour.fund) return { ...base, session: true, onboarded: true, needsFund: true, queriedAs, balance: null };
  const { fundId } = tour.fund;

  try {
    const [invitations, commitments, everyObligation, everyAllocation, requests, balance] = await Promise.all([
      activeContracts<InvitationPayload>(config, me.party, { templateId: config.templates.CommitmentInvitation }),
      activeContracts<CommitmentPayload>(config, me.party, { templateId: config.templates.InvestorCommitment }),
      activeContracts<ObligationPayload>(config, me.party, { templateId: config.templates.CapitalCallObligation }),
      activeContracts<Record<string, never>, AllocationContract['interfaceView']>(config, me.party, { interfaceId: config.interfaces.Allocation }),
      activeContracts<Record<string, never>, AllocationRequestView>(config, me.party, { interfaceId: config.interfaces.AllocationRequest }),
      walletBalance(config).then((b) => Number(b.effective_unlocked_qty)).catch(() => null),
    ]);
    // Only this browser's demo fund. The same party may hold notices in other
    // demo funds, and their payments are left out as the server does.
    const obligations = everyObligation.filter((o) => o.payload.fundId === fundId);
    const elsewhere = new Set(everyObligation.filter((o) => o.payload.fundId !== fundId).map((o) => o.payload.obligationRef));
    const allocations = everyAllocation
      .filter((a): a is typeof a & { interfaceView: AllocationContract['interfaceView'] } => Boolean(a.interfaceView?.allocation))
      .filter((a) => !elsewhere.has(a.interfaceView.allocation.settlement.settlementRef.id));
    const adminParty = obligations[0]?.payload.admin ?? '';
    const payments = classifyPayments({
      adminParty,
      obligations: obligations as ObligationContract[],
      allocations: allocations.map((a) => ({ contractId: a.contractId, interfaceView: a.interfaceView })),
    });
    const records = new Map(await Promise.all(obligations.map(async (o) => [o.payload.obligationRef, await fetchRecord(o.payload.obligationRef, signal)] as const)));

    const rows: Obligation[] = obligations.map((o) => {
      const p = o.payload;
      const own = payments.filter((x) => x.obligationRef === p.obligationRef);
      const record = records.get(p.obligationRef);
      const receipt = record?.receipt ?? null;
      const outcome = obligationOutcome(o as ObligationContract, payments, receipt);
      const request = requests.find((r) => r.interfaceView?.settlement.settlementRef.id === p.obligationRef);
      return {
        ref: p.obligationRef,
        obligationCid: o.contractId,
        callId: p.callId,
        investor: 'guest',
        fundName: p.fundName,
        scenarioUsd: Number(p.scenarioAmount),
        units: Number(p.amountDue),
        instrument: p.instrumentId.id,
        dueAt: p.dueAt,
        ledgerState: p.state,
        outcome,
        status: businessStatus(p.state, outcome, own),
        note: p.reviewNote,
        settledAfterDue: p.settlement?.settledAfterDue ?? null,
        payments: own.map((x) => ({ allocationCid: x.allocationCid, amount: x.amount, from: x.sender === me.party ? 'guest' : 'unknown', kind: x.kind, recommendation: x.recommendation })),
        receipt,
        timeline: record?.timeline ?? [],
        paymentRequest: request?.interfaceView ? { contractId: request.contractId, view: request.interfaceView } : null,
      };
    });

    const calls: Call[] = [...new Set(rows.map((r) => r.callId))].map((callId) => {
      const list = rows.filter((r) => r.callId === callId);
      return { callId, description: null, dueAt: list[0]?.dueAt ?? '', headerTotalUsd: null, obligations: list, totals: totalsOf(list) };
    }).sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt));

    const view: ViewWithSession = {
      ...base,
      session: true,
      onboarded: true,
      queriedAs,
      fund: tour.fund,
      fundName: tour.fundName,
      calls,
      totals: totalsOf(rows),
      invitations: invitations.filter((i) => i.payload.fundId === fundId).map((i) => ({ invitationCid: i.contractId, investor: 'guest', fundName: i.payload.fundName, committedUsd: Number(i.payload.committedScenarioAmount) })),
      commitments: commitments.filter((c) => c.payload.fundId === fundId).map((c) => ({ investor: 'guest', committedUsd: Number(c.payload.committedScenarioAmount), calledUsd: Number(c.payload.calledScenarioAmount) })),
      payments: payments.map((x) => ({ ...x, from: x.sender === me.party ? 'guest' : 'unknown', investor: 'guest' })),
      balance,
      joined: tour.guest?.party === me.party,
    };
    return view;
  } catch (error) {
    // A sign-in that ended while reading puts the seat back to signing in.
    if (error instanceof SignedOut) return { ...base, session: true, onboarded: false, sessionTag: '', fingerprint: null };
    throw error;
  }
}

// ---------------------------------------------------------------- what the signed-in LP does itself
// Each resolves to the message to show. Each runs in this browser with the
// LP's own token, against the ledger or the LP's own Canton wallet.
export async function acceptInvitation(config: SignInConfig, invitationCid: string): Promise<string> {
  const me = identity();
  if (!me) throw new SignedOut();
  await exercise(config, me, { templateId: config.templates.CommitmentInvitation, contractId: invitationCid, choice: 'Invitation_Accept', argument: {} });
  return 'Commitment accepted with your own login.';
}

export async function payFromWallet(config: SignInConfig, obligation: Obligation): Promise<string> {
  const me = identity();
  if (!me) throw new SignedOut();
  if (!obligation.paymentRequest) throw new Error('This notice has no open payment request, so your wallet has nothing to fund.');
  const { allocationCid } = await walletAllocate(config, obligation.paymentRequest.view, me.party);
  return allocationCid
    ? `${obligation.units} CC locked for the fund from your Canton wallet. The fund manager settles it next.`
    : 'Your wallet took the request but has not locked the coin yet. The payment shows on this notice once it has.';
}

export async function withdrawToWallet(config: SignInConfig, allocationCid: string): Promise<string> {
  await walletWithdraw(config, allocationCid);
  return 'Payment withdrawn. The CC is back in your wallet.';
}

export async function tapWallet(config: SignInConfig, amount = '20.0'): Promise<string> {
  await walletTap(config, amount);
  return `Your wallet received ${Number(amount)} test CC from the DevNet faucet.`;
}
