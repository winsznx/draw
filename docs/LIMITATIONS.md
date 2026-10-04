# Limitations

Plainly, what DRAW does not do or has not shown yet.

## Environment

- The canonical flow has run on the HackCanton DevNet node and on LocalNet. The 100-case campaign, the ablation, and the browser journey have only run on LocalNet (the browser journey has not passed yet).
- On the DevNet node one hackathon account acts for all five demo parties, so credential separation is only proven on LocalNet.
- All LPs sit on one LocalNet participant. Its operator can read every LP. Production needs each LP on its own validator or a trusted provider.
- The settlement asset is LocalNet Amulet from the DevNet tap. No real money, no USDCx, no bank rail.

## Product

- Overdue needs an admin click after the due time. There is no scheduler.
- The admin clicks Settle by default. `DRAW_AUTO_SETTLE=true` settles exact matches automatically through the same path, but that mode has not run against a ledger yet.
- Commitments are created in the demo setup. There is no onboarding, KYC, or document flow.
- One currency and instrument per fund. Scenario dollars and Amulet units are separate fields, and the UI labels both.
- No partial payments. Anything other than the exact amount is refused.
- No notifications. LPs see notices when they open the app.
- The investor list is fixed at three demo LPs plus an unrelated party.

## Security

- The demo app server holds every role's credential, and on LocalNet could mint any token. `SECURITY.md` describes the production model, which is not built.
- The token registry operator (DSO) sees every allocation's settlement reference. References are random and name no one.
- The verifier runs in the same process as the submitter in scripts and the app.

## Evidence

- No conversation with a fund operations practitioner is on file. Market claims stay hypotheses.
- Campaign cases call at most three LPs.
- An expired allocation and a mid-payment network failure have not been produced in a run.
- The transaction-stream privacy check and the browser journey are written but have not passed yet. LocalNet went down before they could run.
