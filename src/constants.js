import img1 from './assets/images/adedayo.jpg';
import img2 from './assets/images/aromat.jpg';
import img3 from './assets/images/chad cat.jpg';
import img4 from './assets/images/dluv.jpg';
import img5 from './assets/images/infinity Z.jpg';
import img6 from './assets/images/marrcus.jpg';
import img7 from './assets/images/pirate.jpg';
import img8 from './assets/images/real one.jpg';
import img9 from './assets/images/wolf.jpg';

export const CANDY_IMAGES = [
  img1, img2, img3, img4, img5, img6, img7, img8, img9
];

export const BOARD_SIZE = 8;
export const MAX_LEVEL = 30;

export const getLevelConfig = (level) => {
  const tileCount = level <= 3 ? 5 : level <= 8 ? 7 : 9;
  return {
    targetScore: level * 8 + 7,
    moves: Math.max(15, 40 - Math.floor(level / 2)),
    tileCount
  };
};

// ── On-chain smart contract integration ─────────────────────────
export const GAME_CONTRACT_ADDRESS = '0x7F8ABBa2bC8Bd8472C76e6d7fC8cD36f223f0496';

export const GAME_CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "streak", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "CheckedIn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "checkIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "level", "type": "uint256" }
    ],
    "name": "ScoreSubmitted",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "score", "type": "uint256" },
      { "internalType": "uint256", "name": "level", "type": "uint256" }
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "", "type": "address" } ],
    "name": "lastCheckIn",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "playerScores",
    "outputs": [
      { "internalType": "uint256", "name": "score", "type": "uint256" },
      { "internalType": "uint256", "name": "level", "type": "uint256" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "", "type": "address" } ],
    "name": "streak",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  }
];