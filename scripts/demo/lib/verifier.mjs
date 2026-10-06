// Independent settlement verifier. It holds its own ledger user, which may
// only read and cannot submit. It takes a claimed update id and an obligation
// reference, re-reads everything from the ledger itself, and only then issues
// VERIFIED_FUNDED. It never sees the submitter's response.
//
// When the fund names a verifier party (draw 0.3.0), it reads through that
// party: the obligations it observes and the settlement transaction it
// witnessed, including the holdings created in it. Otherwise it reads as the
// fund admin, the way earlier funds were verified.
import { LedgerClient, TEMPLATES, INTERFACES, transactionEvents, templateName } from './ledger.mjs';

const decimalEquals = (a, b) => Number(a) === Number(b);

export class SettlementVerifier {
  constructor({ baseUrl, userId, adminParty, instrument, verifierParty }) {
    this.client = new LedgerClient({ baseUrl, userId, label: 'verifier' });
    this.adminParty = adminParty;
    this.verifierParty = verifierParty;
    this.instrument = instrument;
    this.consumedUpdateIds = new Map();
  }

  // The verifier party when it observes this obligation, otherwise the admin.
  async readerFor(obligationRef) {
    if (this.verifierParty) {
      const seen = await this.client.activeContracts(this.verifierParty, { templateId: TEMPLATES.CapitalCallObligation });
      if (seen.some((o) => o.payload.obligationRef === obligationRef)) return { party: this.verifierParty, obligations: seen };
    }
    return { party: this.adminParty, obligations: await this.client.activeContracts(this.adminParty, { templateId: TEMPLATES.CapitalCallObligation }) };
  }

  // Returns a receipt. `verdict` is VERIFIED_FUNDED only if every check holds.
  async verify({ obligationRef, claimedUpdateId }) {
    const checks = [];
    const check = (name, ok, detail) => {
      checks.push({ name, ok: Boolean(ok), detail });
      return Boolean(ok);
    };

    const priorUse = this.consumedUpdateIds.get(claimedUpdateId);
    check('update id not already used as evidence', priorUse === undefined || priorUse === obligationRef,
      priorUse ? `already used for ${priorUse}` : 'unused');

    const reader = await this.readerFor(obligationRef);
    const ownParty = reader.party !== this.adminParty;
    const current = reader.obligations.find((o) => o.payload.obligationRef === obligationRef);
    check(ownParty ? 'obligation found through the verifier party' : 'obligation found in admin ACS by reference', current, current?.contractId);

    let update;
    try {
      update = await this.client.updateById(reader.party, claimedUpdateId, { holdingViews: ownParty });
    } catch (error) {
      check('claimed update readable by verifier', false, error.message);
    }
    const transaction = update?.update?.Transaction?.value;
    check('claimed update is a transaction', transaction, transaction?.updateId);
    const events = transactionEvents(transaction);

    const settleExercise = events.find((e) => e.kind === 'exercised' && e.choice === 'Obligation_Settle');
    check('update exercises Obligation_Settle', settleExercise, settleExercise?.contractId);

    const allocationCid = settleExercise?.choiceArgument?.allocationCid;
    const executeTransfer = events.find(
      (e) => e.kind === 'exercised' && e.choice === 'Allocation_ExecuteTransfer' && e.contractId === allocationCid,
    );
    check('same update executes the referenced allocation', executeTransfer, allocationCid);
    check('allocation execution consumed the allocation', executeTransfer?.consuming === true, executeTransfer?.consuming);

    const fundedCreate = events.find(
      (e) => e.kind === 'created' && templateName(e.templateId) === 'Draw.CapitalCall:CapitalCallObligation',
    );
    const funded = fundedCreate?.createArgument;
    check('update creates the funded obligation for this reference', funded?.obligationRef === obligationRef && funded?.state === 'Funded',
      { obligationRef: funded?.obligationRef, state: funded?.state });

    const receiverHoldingCids = funded?.settlement?.receiverHoldingCids ?? [];
    check('settlement record names receiver holdings', receiverHoldingCids.length > 0, receiverHoldingCids);

    const currentState = current?.payload?.state;
    check(ownParty ? 'current obligation seen by the verifier party is the funded one' : 'current admin ACS obligation is the funded one',
      current?.contractId === fundedCreate?.contractId && currentState === 'Funded',
      { acs: current?.contractId, update: fundedCreate?.contractId, state: currentState });

    // The admin's own ACS shows its holdings are still active. A verifier
    // party is not a stakeholder of them, so it checks the holdings created in
    // the settlement transaction it witnessed instead.
    let received;
    if (ownParty) {
      received = events
        .filter((e) => e.kind === 'created' && receiverHoldingCids.includes(e.contractId))
        .map((e) => ({ contractId: e.contractId, interfaceView: e.interfaceViews?.find((v) => v.interfaceId?.endsWith(':Splice.Api.Token.HoldingV1:Holding'))?.viewValue }))
        .filter((h) => h.interfaceView);
      check('receiver holdings were created in the settlement transaction', received.length === receiverHoldingCids.length,
        received.map((h) => h.contractId));
    } else {
      const holdings = await this.client.activeContracts(this.adminParty, { interfaceId: INTERFACES.Holding });
      received = holdings.filter((h) => receiverHoldingCids.includes(h.contractId));
      check('receiver holdings are active in admin ACS', received.length === receiverHoldingCids.length,
        received.map((h) => h.contractId));
    }
    const receivedAmount = received.reduce((sum, h) => sum + Number(h.interfaceView.amount), 0);
    check('receiver holdings owned by fund admin', received.every((h) => h.interfaceView.owner === this.adminParty));
    check('receiver holdings are the expected instrument', received.every(
      (h) => h.interfaceView.instrumentId.admin === this.instrument.admin && h.interfaceView.instrumentId.id === this.instrument.id,
    ), this.instrument);
    check('received amount equals amount due', decimalEquals(receivedAmount, funded?.amountDue),
      { received: receivedAmount, due: funded?.amountDue });
    check('payer is the obligated LP', funded?.lp === current?.payload?.lp, funded?.lp);

    const verdict = checks.every((c) => c.ok) ? 'VERIFIED_FUNDED' : 'CONTRADICTED';
    if (verdict === 'VERIFIED_FUNDED') this.consumedUpdateIds.set(claimedUpdateId, obligationRef);

    return {
      verdict,
      // Who the ledger saw read: the subject of the token the reads above carried.
      // Read from the requests already made, so nothing here can fail after a settlement.
      verifierUser: this.client.requestSubject,
      readAs: reader.party,
      obligationRef,
      claimedUpdateId,
      obligationContractId: current?.contractId,
      lp: funded?.lp,
      amountDue: funded?.amountDue,
      scenarioAmount: funded?.scenarioAmount,
      allocationCid,
      receiverHoldingCids,
      receivedAmount,
      instrument: this.instrument,
      recordTime: transaction?.recordTime,
      effectiveAt: transaction?.effectiveAt,
      checks,
    };
  }
}
