<div align="center">

<img src="docs/screenshots/hero.png" alt="Nads Smash lobby" width="100%" />

# Nads Smash

**Match · Blast · Conquer: a Web3 match-3 puzzle game on Base**

Swap the nads, chain big combos, keep your daily streak alive and put your best score on the on-chain leaderboard.

[![Play now](https://img.shields.io/badge/▶_Play_now-nads--match.vercel.app-5A2CF0?style=for-the-badge)](https://nads-match.vercel.app)

![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Base](https://img.shields.io/badge/Base_Mainnet-0052FF?style=flat-square&logo=coinbase&logoColor=white)
![wagmi](https://img.shields.io/badge/wagmi_+_viem-1C1B1B?style=flat-square)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [How to play](#how-to-play)
- [On-chain features](#on-chain-features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Smart contract](#smart-contract)
- [Project structure](#project-structure)
- [Scripts](#scripts)

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/lobby.png" width="240" alt="Lobby" /><br /><sub><b>Lobby</b></sub></td>
    <td align="center"><img src="docs/screenshots/connect-wallet.png" width="240" alt="Connect wallet" /><br /><sub><b>Connect wallet</b></sub></td>
    <td align="center"><img src="docs/screenshots/daily-check-in.png" width="240" alt="Daily check-in" /><br /><sub><b>Daily check-in</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/level-intro.png" width="240" alt="Level intro" /><br /><sub><b>Level intro</b></sub></td>
    <td align="center"><img src="docs/screenshots/gameplay.png" width="240" alt="Gameplay" /><br /><sub><b>Gameplay</b></sub></td>
    <td align="center"><img src="docs/screenshots/level-complete.png" width="240" alt="Level complete" /><br /><sub><b>Level complete</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/pause-menu.png" width="240" alt="Pause menu" /><br /><sub><b>Pause menu</b></sub></td>
    <td align="center"><img src="docs/screenshots/leaderboard.png" width="240" alt="Leaderboard" /><br /><sub><b>On-chain leaderboard</b></sub></td>
    <td></td>
  </tr>
</table>

> The leaderboard and streak in these screenshots use sample data.

---

## Features

### Gameplay

- **30 levels** on an 8×8 board, with targets that climb and moves that shrink as you go
- **Cascading combos**: cleared nads fall, new ones drop in, and chains call out *Nice!*, *Smashing!*, *Nad-tastic!* and *Unstoppable!*
- **Comet Blast**: match 5 in a row for a big bonus and a blast that clears up to 8 extra nads
- **3-star rating** for every level, based on how far past the target you go
- **Fair play rules**: a swap that doesn't match costs no move, and a board with no moves left reshuffles itself for free
- **Hints**: stay idle for 5 seconds and a valid move starts to wiggle
- **Swipe or tap**: swipe a nad toward a neighbour, or tap two neighbours

### Feel

- Pieces slide, fall and pop with tracked animations instead of jumping in place
- Score counts up, a progress meter fills toward three stars, and big moves shake the board
- Sound effects synthesized with the Web Audio API (no audio files), with a mute button that remembers your choice
- Haptic feedback on phones that support vibration
- Mobile-first layout that also works on desktop

### Web3

- Connect with **MetaMask, Coinbase Wallet, Phantom, Rainbow, HaHa Wallet or WalletConnect**
- **Daily check-in** on-chain with a 7-day streak calendar
- **Post your score** to Base from the pause menu, the win screen or the game-over screen
- **Global leaderboard** read straight from contract events, no backend
- **BaseScan link** for every score you post
- Automatic prompt to switch your wallet to Base when it's on another network

---

## How to play

1. **Connect your wallet** and type a nickname.
2. **Swap** two neighbouring nads to line up 3 or more of the same kind.
3. **Hit the target score** before you run out of moves.
4. **Post your score** on Base and climb the leaderboard.

### Scoring

| Match | Points | Bonus |
| --- | --- | --- |
| 3 in a row | 10 | |
| 4 in a row | 20 | |
| 5+ in a row | 50 | Comet Blast clears up to 8 random extra nads |

Cascades score each new match they create, so one good swap can chain into several.

### Stars

| Stars | Score needed |
| --- | --- |
| ⭐ | Reach the target |
| ⭐⭐ | 1.2× the target |
| ⭐⭐⭐ | 1.5× the target |

### Difficulty curve

| Level | Target score | Moves | Nad types on the board |
| --- | --- | --- | --- |
| 1 | 15 | 40 | 5 |
| 5 | 47 | 38 | 7 |
| 10 | 87 | 35 | 9 |
| 20 | 167 | 30 | 9 |
| 30 | 247 | 25 | 9 |

The formulas live in `src/constants.js`:

- Target: `level × 8 + 7`
- Moves: `max(15, 40 − floor(level / 2))`
- Nad types: 5 on levels 1–3, 7 on levels 4–8, all 9 from level 9

More nad types means fewer natural matches, so later levels get noticeably harder.

---

## On-chain features

Everything on-chain runs through a single game contract on **Base Mainnet**. Playing is free; check-ins and posting scores cost a small amount of gas.

### Daily check-in

- Calls `checkIn()` on the contract
- One check-in every 24 hours, with a live countdown until the next one
- Your streak is read from the contract and shown on a 7-day calendar

### Score submission

- Calls `submitScore(score, level)` and emits a `ScoreSubmitted` event
- Once the transaction confirms, your score shows up on the leaderboard right away
- A link to the transaction on BaseScan appears under the button

### Leaderboard

The leaderboard is built in the browser from `ScoreSubmitted` events, with no server or database:

- Covers roughly the **last 4.6 days** of Base blocks
- Keeps each wallet's **best** score and shows the top 10 on a podium and list
- Refreshes every 30 seconds, and pauses while the tab is in the background
- After the first load, each refresh only asks for new blocks
- Falls back across several public Base RPCs and splits large block ranges when a server refuses them

### Builder code

If `VITE_BUILDER_CODE` is set, it is appended to the calldata of check-in and score transactions, so they're attributed to the app on Base.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| UI | React 19, plain CSS, Lucide icons |
| Fonts | Lilita One, Baloo 2 (self-hosted via Fontsource) |
| Build | Vite 8, ESLint |
| Wallets and chain | wagmi 2, viem 2, Coinbase OnchainKit, WalletConnect |
| Data fetching | TanStack Query 5 |
| Network | Base Mainnet |
| Hosting | Vercel |

---

## Getting started

### Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 8)
- A browser wallet (MetaMask, Coinbase Wallet, Phantom) or a WalletConnect-compatible mobile wallet
- A little ETH on Base if you want to check in or post scores

### Run it locally

```bash
# 1. Clone the repo
git clone https://github.com/HarisFaisal-56/nads-match.git
cd nads-match

# 2. Install dependencies
npm install

# 3. Add your environment variables
cp .env.example .env

# 4. Start the dev server
npm run dev
```

Then open http://localhost:5173.

### Build for production

```bash
npm run build     # outputs to dist/
npm run preview   # serves the production build locally
```

---

## Environment variables

Create a `.env` file in the project root (start from `.env.example`):

```env
VITE_WC_PROJECT_ID=your_walletconnect_project_id
VITE_CONTRACT_ADDRESS=0x7F8ABBa2bC8Bd8472C76e6d7fC8cD36f223f0496
VITE_BUILDER_CODE=your_builder_code
VITE_BASE_RPC_URL=https://your-base-rpc-url
```

| Variable | Required | What it does |
| --- | --- | --- |
| `VITE_WC_PROJECT_ID` | For WalletConnect | Project ID from [Reown Cloud](https://cloud.reown.com). Needed for WalletConnect, Rainbow and HaHa Wallet. |
| `VITE_CONTRACT_ADDRESS` | No | Game contract address. Defaults to the deployed contract below. |
| `VITE_BUILDER_CODE` | No | Base builder code added to transaction calldata. |
| `VITE_BASE_RPC_URL` | No | A dedicated Base RPC that the leaderboard tries first, before the public ones. |

---

## Smart contract

**Network:** Base Mainnet (chain ID 8453)
**Address:** [`0x7F8ABBa2bC8Bd8472C76e6d7fC8cD36f223f0496`](https://basescan.org/address/0x7F8ABBa2bC8Bd8472C76e6d7fC8cD36f223f0496)

| Function / event | Type | Purpose |
| --- | --- | --- |
| `checkIn()` | write | Records today's check-in and updates the streak |
| `submitScore(uint256 score, uint256 level)` | write | Posts a score for a level |
| `streak(address)` | view | Current check-in streak for a wallet |
| `lastCheckIn(address)` | view | Timestamp of a wallet's last check-in |
| `playerScores(address, uint256)` | view | A wallet's stored scores (score, level, timestamp) |
| `CheckedIn(user, streak, timestamp)` | event | Emitted on every check-in |
| `ScoreSubmitted(player, score, level)` | event | Emitted on every score; the leaderboard reads these |

The full ABI is in `src/constants.js`.

---

## Project structure

```text
nads-match/
├── public/                    # favicon and static icons
├── docs/screenshots/          # images used in this README
├── src/
│   ├── assets/                # logo, wallet logos, nad character art
│   ├── App.jsx                # screens: lobby, game, results; daily check-in panel
│   ├── GameBoard.jsx          # board, HUD, input, animations, pause menu
│   ├── LevelComplete.jsx      # win screen with stars and confetti
│   ├── GameOver.jsx           # out-of-moves screen
│   ├── Leaderboard.jsx        # podium and ranking list
│   ├── SubmitScore.jsx        # "Post score on Base" button
│   ├── WalletModal.jsx        # wallet picker
│   ├── ui.jsx                 # shared UI pieces (ribbons, stars, confetti, mute)
│   ├── useGameLogic.js        # matching, cascades, scoring, shuffles
│   ├── pieces.js              # piece tracking for animations, hints
│   ├── useDailyCheckIn.js     # on-chain check-in and streak
│   ├── useOnChainLeaderboard.js  # leaderboard from ScoreSubmitted events
│   ├── useScoreTx.js          # score transaction state
│   ├── useEnsureBase.js       # switches the wallet to Base
│   ├── sound.js               # Web Audio sound effects and haptics
│   ├── constants.js           # level config, contract address and ABI
│   ├── wagmi-config.js        # wallet connectors and Base transport
│   └── main.jsx               # app providers (wagmi, React Query, OnchainKit)
├── test-logs.mjs              # dev script: query ScoreSubmitted logs
├── test-logs-chunked.mjs      # dev script: same, in block chunks
└── .env.example
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

<div align="center">

Built on **Base** 🔵 by [HarisFaisal-56](https://github.com/HarisFaisal-56)

</div>
