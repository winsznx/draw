# Environment

Recorded 2026-10-01 on the build machine. No secrets are stored here.

| Item | Value |
|---|---|
| OS | macOS 27.0, arm64, 8 CPU, 32 GB RAM |
| Daml SDK | 3.5.12 via `dpm` 1.0.22 (`~/.dpm/bin`), damlc component 3.5.3, bundled Canton 3.5.19 |
| Java | OpenJDK 21.0.12 (Homebrew `openjdk@21`), `JAVA_HOME=/opt/homebrew/opt/openjdk@21` |
| Docker | Docker Desktop 29.7.2, Compose 5.4.0, about 12.5 GB RAM allotted to the VM |
| Node | 24.19.0, npm 11.17.0, pnpm available |
| Splice LocalNet | target 0.8.4 (released 2026-09-25, Canton 3.5.19). Not yet pulled |
| AppsFactory starter | none in repo |
| NODERS material | none in repo |
| DevNet credentials | none present. `BLOCKED_ON_HUMAN` |
| Network | docs.digitalasset.com, get.digitalasset.com, GitHub reachable |

## Constraints seen

- Host disk ran out mid-session (13 GB free at start, 0 after the SDK install and Docker growth). The human freed space and about 34 GB is free now. LocalNet needs several GB of images, so disk stays a watch item.
- Two unrelated Supabase stacks auto-start with Docker and use about 3.5 GB of the VM's RAM. They are left running. If LocalNet hits memory limits, ask before stopping them.

## Commands

```sh
export PATH="$HOME/.dpm/bin:$PATH" JAVA_HOME=/opt/homebrew/opt/openjdk@21
cd contracts && dpm build --all          # draw + draw-tests
cd contracts/tests && dpm test           # Daml Script suites
scripts/gates/daml_core.sh               # DAML_CORE gate, writes evidence/local/daml_core/<run>/
scripts/gates/mutation_check.sh          # guard mutants, writes evidence/local/mutation/<run>/
```
