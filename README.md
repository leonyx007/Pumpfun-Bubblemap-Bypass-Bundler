# Pumpfun Bubblemap Bypass Bundler
![Pumpfun Bubblemap Bypass Bundler Banner](./image1.jpg)

> Pump.fun launch bundler with a core Bubblemap bypass engine, flexible wallet controls, and relay-ready architecture.

## Overview
Pumpfun Bubblemap Bypass Bundler is a Solana automation project made for Pump.fun token launches.
It is built to help teams launch with higher execution speed while keeping wallet behavior more structured and flexible.
The core idea is not just bundling fast, but bundling in a way that looks cleaner on monitoring surfaces.

### Main goals
- Support Pump.fun token launch and first-buy workflow.
- Improve wallet graph behavior with a Bubblemap bypass strategy.
- Allow flexible control over bundler wallet count and flow.
- Keep execution modular so relay strategy can evolve.
- Provide lifecycle commands for sell, gather, and cleanup.

## Why this project
Many launch scripts are single-wallet or low-structure tools.
This repository focuses on operational flow:
- wallet distribution before launch
- coordinated buy execution
- post-launch transfer behavior
- sell and gather utilities

The result is a more complete launch toolkit for Pump.fun operators.

## Core features
### Pump.fun native launch flow
- Create token metadata and creation instruction flow.
- Execute launch with grouped buy transactions.
- Handle launch orchestration from one entrypoint.

### Bubblemap bypass engine (core)
- Wallet role separation and staged movement.
- Structured transaction emission pattern.
- Reduced naive clustering signals in simple graph views.

### Flexible wallet management
- `wallets.json` controls bundler wallets.
- `otherWallets.json` controls destination wallets.
- Easy to scale wallet count up or down per strategy.

### Relay-oriented execution design
- Jito execution path is implemented.
- Executor design is modular for future relay expansion.
- Suitable for extending into Bloxroute-style integration logic.

### Lifecycle tooling
- Launch: `npm run start`
- Sell: `npm run sell`
- Gather: `npm run gather`
- LUT close: `npm run close`

## Repository layout
```text
.
├── index.ts                 # Main launch entrypoint
├── sell.ts                  # Sell utility
├── gather.ts                # Gather and cleanup utility
├── closeLut.ts              # LUT close utility
├── wallets.json             # Bundler wallet keys
├── otherWallets.json        # Destination wallet keys
├── .env.example             # Env template
├── src/
│   ├── main.ts              # Launch orchestration
│   ├── pumpfun.ts           # SDK wrapper logic
│   ├── uploadToIpfs.ts      # Metadata upload
│   └── ...
├── executor/
│   ├── jito.ts              # Bundle execution
│   └── legacy.ts            # Standard tx execution
├── constants/
│   └── constants.ts         # Env-to-runtime mapping
└── utils/
    ├── transfer.ts          # Post-launch transfer logic
    └── ...
```

## Requirements
- Node.js 18 or newer
- npm
- Solana mainnet RPC endpoint
- Solana websocket endpoint
- funded main wallet with enough SOL

## Installation
```bash
git clone <your-repo-url>
cd Pumpfun-Bubblemap-Bypass-Bundler
npm install
```

## Quick setup
1. Copy env file:
```bash
cp .env.example .env
```
2. Add your main wallet key and launch parameters in `.env`.
3. Fill `wallets.json` with bundler wallet private keys.
4. Fill `otherWallets.json` with destination wallet private keys.
5. Run:
```bash
npm run start
```

## Environment configuration
Use this as baseline:
```env
PRIVATE_KEY=
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
RPC_WEBSOCKET_ENDPOINT=wss://api.mainnet-beta.solana.com
SWAP_AMOUNT=0.001
JITO_FEE=0.001
TOKEN_NAME="Floki Sniffing SOL"
TOKEN_SYMBOL="FLOKI"
DESCRIPTION="Your token description"
TOKEN_SHOW_NAME="Desk"
TOKEN_CREATE_ON="https://pump.fun"
TWITTER="https://x.com/"
TELEGRAM="https://t.me"
WEBSITE="https://website.com"
FILE="./image/ragnar.jpg"
SELL_PERCENT=10
```

### Config notes
- `PRIVATE_KEY`: base58 secret key.
- `SWAP_AMOUNT`: per-wallet buy size in SOL.
- `JITO_FEE`: bundle tip-related amount.
- `FILE`: image path for metadata upload.
- `SELL_PERCENT`: percent of token balance sold by sell script.

## Wallet files
### `wallets.json`
Array of base58 private keys used as launch/bundler wallets.

### `otherWallets.json`
Array of base58 private keys used as destination wallets in transfer stage.
For one-to-one transfer behavior, keep arrays aligned by index.

## Launch workflow
The `index.ts` flow is:
1. Read env and wallet files.
2. Generate mint keypair.
3. Create token metadata and creation instructions.
4. Distribute SOL to bundler wallets.
5. Create and extend Address Lookup Table (LUT).
6. Build grouped buy instructions.
7. Build and sign versioned transactions.
8. Send bundle through Jito executor.
9. Trigger post-launch transfer routine.

This structure gives repeatable launches and cleaner operational control.

## Commands
```bash
npm run start   # launch and bundle buy workflow
npm run sell    # sell by SELL_PERCENT
npm run gather  # gather tokens/SOL to main wallet
npm run close   # close LUT process
```

## Bubblemap bypass architecture
The bypass engine is a strategy layer, not a single exported function.
It is formed by:
- staged SOL distribution
- multi-wallet buy orchestration
- role-based wallet behavior
- transfer routing after launch
- optional gather/cleanup flow

Together these choices can reduce obvious bundler clustering patterns.

## Security practices
- Never commit `.env`.
- Never expose private keys.
- Use dedicated wallet sets.
- Keep encrypted key backups.
- Validate JSON file format before running scripts.

## Troubleshooting
### `PRIVATE_KEY is not set`
Ensure `.env` exists and `PRIVATE_KEY` is defined.

### Main balance not enough
Fund main wallet for distribution, fees, and launch overhead.

### Bundle not landing
Switch to better RPC, review fee/tip settings, and retry under lower congestion.

### Transfer or gather failures
Check wallet file integrity, token balances, and destination wallet alignment.

## FAQ
### Is it only for Pump.fun?
Current implementation is Pump.fun-focused.

### Can I control number of bundler wallets?
Yes, update `wallets.json`.

### Can I change sell behavior?
Yes, adjust `SELL_PERCENT` and run `npm run sell`.

### Where is the core bypass logic?
Across launch orchestration and wallet-flow strategy in distribution, buy, transfer, and lifecycle scripts.

## Responsible use
This repository is provided for automation and engineering purposes.
Users are responsible for compliance with all laws and platform policies.
Do not use this software for fraud, manipulation, or harmful activity.

## Disclaimer
No profit is guaranteed.
All token launch and trading operations involve risk.
Use at your own risk.

Built for Pump.fun launch operations with Bubblemap bypass architecture at the core.
