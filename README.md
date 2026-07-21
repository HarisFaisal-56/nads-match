# 🎮 NADS Smash

A Web3 Match-3 puzzle game built on **Base Mainnet**, combining classic puzzle gameplay with on-chain features such as wallet authentication, daily check-in streaks, score submission, and a decentralized leaderboard.

## 🚀 Live Demo

https://nads-match.vercel.app

---

## ✨ Features

- 🔗 Multi-wallet support (MetaMask, Coinbase Wallet, Rainbow, Phantom, WalletConnect)
- 🏆 Decentralized on-chain leaderboard
- 📅 Daily check-in streak system
- 💥 Match-3 puzzle gameplay with combo chains
- ☄️ Special Comet Blast ability for high-value matches
- ⛓️ On-chain score submission
- 🔍 BaseScan transaction verification
- 📱 Fully responsive design
- 🎨 Modern glassmorphism UI

---

## 🛠 Tech Stack

### Frontend
- React 19
- Vite
- JavaScript (ES6+)
- CSS3

### Web3
- Base Mainnet
- Wagmi
- Viem
- Coinbase OnchainKit
- WalletConnect
- TanStack React Query

### Deployment
- Vercel

---

## 🎮 Gameplay

Players connect their wallet, enter the game, complete levels, and submit scores directly on-chain.

The game features:

- 30 progressively challenging levels
- Cascading combo mechanics
- Special Comet Blast power-ups
- Daily streak rewards
- Global on-chain leaderboard rankings

---

## 🏗 Project Structure

```text
src/
├── assets/
├── components/
├── App.jsx
├── main.jsx
├── constants.js
└── wagmi-config.js
```

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/HarisFaisal-56/nads-match.git
```

Navigate to the project:

```bash
cd nads-match
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_WC_PROJECT_ID=your_walletconnect_project_id
VITE_CONTRACT_ADDRESS=your_contract_address
VITE_BUILDER_CODE=your_builder_code
```

---

## 🚀 Future Improvements

- NFT rewards and collectibles
- PvP multiplayer mode
- Tournament system
- Gasless transactions
- Achievement badges
- Enhanced leaderboard rewards

---

## 👨‍💻 Author

**Haris Faisal**

GitHub: https://github.com/HarisFaisal-56

---

Built on Base Mainnet.
