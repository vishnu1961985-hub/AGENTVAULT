# AgentVault

AgentVault is a rule-bound native-payment vault for an autonomous AI agent on MST Testnet. The agent can request payments, but the AgentVault contract enforces the spending policy and records Allowed, Blocked, and Pending decisions on-chain.

## Live demo configuration

The dashboard is wired to the live-demo vault:

- MST Testnet RPC: `https://testnetrpc.mstblockchain.com`
- Chain ID: `91562037`
- AgentVault: `0x746392d55268c859cBf16bcc8b7902615D2be8b1`
- MockMerchant: `0xD141f9dB830C3733F62aB09dECB41EA893B6418F`

The repository's `scripts/setup-live-demo.ts` is the source for the demo configuration. It sets the owner-defined daily limit to 5 MSTC, per-transaction maximum to 1 MSTC, allowlists MockMerchant, and funds the vault up to 5 MSTC. The separate `scripts/set-tier0-daily-limit.ts` configures Tier 0 to 5 MSTC.

## Architecture

- `contracts/AgentVault.sol` — on-chain policy enforcement and payment state.
- `contracts/AgentVaultFactory.sol` — vault creation.
- `agent/` — Agent Service HTTP API and MST transaction client.
- `simulation/` — local receipt/payment-intent simulation and tests.
- `frontend/` — live React dashboard connected to AgentVault and the Agent Service.

Payment flow:

`Dashboard → Agent Service → AgentVault.pay() → Allowed / Blocked / Pending → blockchain event → dashboard activity`

The browser wallet is the human owner/control wallet. The agent service signs payment requests with the configured agent key. The agent key must correspond to the `agent()` address stored in the vault.

## Run the dashboard

From `frontend/`:

```powershell
npm install
npm run dev
```

The Vite development server proxies `/api/*` to the Agent Service at `http://localhost:3000`.

## Run the Agent Service

Create `agent/.env` locally. Never commit the real private key.

```text
MST_RPC_URL=https://testnetrpc.mstblockchain.com
AGENT_PRIVATE_KEY=<your agent signing key>
AGENTVAULT_ADDRESS=0x746392d55268c859cBf16bcc8b7902615D2be8b1
AGENT_SERVICE_PORT=3000
```

Then from the repository root:

```powershell
npm install
npm run dev:service
```

Health check:

```text
GET http://localhost:3000/api/health
```

## Contract controls

Owner-only dashboard actions write directly to the vault:

- pause / resume
- daily limit
- per-transaction maximum
- approval threshold
- trust-tier limits and progression
- recipient allowlist
- per-recipient cap
- pending payment approval / rejection

Payment requests never bypass the contract. A blocked request is recorded as a blocked decision rather than being treated as a successful payment.

## Tests

```powershell
npx hardhat test
```

The simulation tests can be run with:

```powershell
python -m unittest tests/test_payment_intent.py -v
```

## Important

Do not put private keys in source files, screenshots, chat messages, or Git history. If a signing key has previously been exposed, replace it before using the project for a real transaction.
