import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnect } from 'wagmi';
import './WalletModal.css';

import phantomIcon from './assets/phantom.png';
import hahaIcon from './assets/haha.png';
import walletConnectIcon from './assets/walletconnect.png';
import metamaskIcon from './assets/metamask logo.png';
import { X, ChevronLeft } from 'lucide-react';
import { Ribbon } from './ui';
/* ─── Icon URLs ───────────────────────────────────────────────── */
const WALLET_ICONS = {
  metamask: metamaskIcon,
  coinbase:
    'https://avatars.githubusercontent.com/u/18060234',
  phantom: phantomIcon,
  rainbow:
    'https://avatars.githubusercontent.com/u/48327834',
  walletconnect: walletConnectIcon,
  haha: hahaIcon,
};

/* Fallback colors per wallet for the letter-circle fallback */
const WALLET_FALLBACK_COLORS = {
  metamask: '#e27625',
  coinbase: '#0052ff',
  phantom: '#ab9ff2',
  rainbow: '#174299',
  haha: '#f97316',
  walletconnect: '#3b99fc',
};

/* Order for the "Popular" section */
const POPULAR_ORDER = ['MetaMask', 'HaHa Wallet', 'Phantom', 'Rainbow', 'Coinbase Wallet', 'WalletConnect'];

const LS_KEY = 'lastConnectedWallet';

/* ─── Helpers ─────────────────────────────────────────────────── */

/** Normalise a connector/wallet name to a canonical key */
function nameKey(name) {
  const n = name.toLowerCase();
  if (n.includes('metamask')) return 'metamask';
  if (n.includes('coinbase')) return 'coinbase';
  if (n.includes('phantom'))  return 'phantom';
  if (n.includes('rainbow'))  return 'rainbow';
  if (n.includes('haha'))     return 'haha';
  if (n.includes('walletconnect')) return 'walletconnect';
  return n;
}

/** Detect which wallets are currently installed in the browser */
function detectInstalled() {
  const installed = new Set();
  if (typeof window === 'undefined') return installed;
  try {
    if (window.ethereum) {
      // MetaMask injects window.ethereum and sets isMetaMask
      if (window.ethereum.isMetaMask) installed.add('metamask');
      // Coinbase Wallet
      if (window.ethereum.isCoinbaseWallet) installed.add('coinbase');
      // Check providers array (multiple wallets installed)
      if (Array.isArray(window.ethereum.providers)) {
        for (const p of window.ethereum.providers) {
          if (p.isMetaMask) installed.add('metamask');
          if (p.isCoinbaseWallet) installed.add('coinbase');
        }
      }
    }
    if (window.coinbaseWalletExtension) installed.add('coinbase');
    if (window.phantom?.ethereum) installed.add('phantom');
  } catch { /* ignore detection errors */ }
  return installed;
}

/** Get the best icon URL for a wallet */
function getIcon(key, connector) {
  return WALLET_ICONS[key] || connector?.icon || null;
}

/** Render a colored circle with the first letter as fallback */
function LetterCircle({ name, walletKey }) {
  const bg = WALLET_FALLBACK_COLORS[walletKey] || 'rgba(255,255,255,0.15)';
  return (
    <div
      className="wm-row-icon wm-row-icon-fallback"
      style={{ background: bg }}
    >
      {name.charAt(0)}
    </div>
  );
}



/* ─── Component ───────────────────────────────────────────────── */

export default function WalletModal({ isOpen, onClose }) {
  const { connect, connectors, isPending } = useConnect();
  const [connectingId, setConnectingId] = useState(null);
  const [imgErrors, setImgErrors] = useState({});  // track broken images
  const [view, setView] = useState('list'); // 'list' | 'get'

  const installed = useMemo(() => detectInstalled(), []);

  // Read last connected wallet from localStorage
  const lastConnected = useMemo(() => {
    try { return localStorage.getItem(LS_KEY) || null; } catch { return null; }
  }, [isOpen]); // re-read every time modal opens

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Reset connecting state & image errors when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConnectingId(null);
      setImgErrors({});
      setView('list');
    }
  }, [isOpen]);

  /* Find best matching connector for a wallet name */
  const findConnector = useCallback((walletName) => {
    const key = nameKey(walletName);
    // First try exact-ish name match
    const match = connectors.find((c) => nameKey(c.name) === key);
    if (match) return match;
    // Fallback — injected connector for MetaMask/Phantom
    if (key === 'metamask' || key === 'phantom') {
      return connectors.find((c) => c.id === 'injected' || c.type === 'injected');
    }
    // Fallback — WalletConnect for mobile-first wallets (Rainbow, HaHa)
    if (key === 'rainbow' || key === 'haha') {
      return connectors.find((c) => nameKey(c.name) === 'walletconnect');
    }
    return null;
  }, [connectors]);

  const handleConnect = useCallback((walletName) => {
    const connector = findConnector(walletName);
    if (!connector) {
      // If no matching connector, open "get a wallet" page
      window.open('https://ethereum.org/wallets/find-wallet/', '_blank');
      return;
    }
    setConnectingId(connector.uid);
    connect(
      { connector },
      {
        onSuccess: () => {
          // Fix 3: persist last connected wallet name
          try { localStorage.setItem(LS_KEY, walletName); } catch { /* ignore */ }
          setConnectingId(null);
          onClose();
        },
        onError: () => { setConnectingId(null); },
      },
    );
  }, [findConnector, connect, onClose]);

  const handleWalletConnect = useCallback(() => {
    const wc = connectors.find((c) => nameKey(c.name) === 'walletconnect');
    if (!wc) return;
    setConnectingId(wc.uid);
    connect(
      { connector: wc },
      {
        onSuccess: () => {
          try { localStorage.setItem(LS_KEY, 'WalletConnect'); } catch { /* ignore */ }
          setConnectingId(null);
          onClose();
        },
        onError: () => { setConnectingId(null); },
      },
    );
  }, [connectors, connect, onClose]);

  /** Handle broken image — swap to letter circle */
  const handleImgError = useCallback((walletName) => {
    setImgErrors((prev) => ({ ...prev, [walletName]: true }));
  }, []);

  if (!isOpen) return null;

  /* Build section lists */
  const installedWallets = POPULAR_ORDER.filter((w) => installed.has(nameKey(w)));
  const installedKeys = new Set(installedWallets.map((w) => nameKey(w)));
  const popularWallets = POPULAR_ORDER.filter((w) => !installedKeys.has(nameKey(w)));

  /** Render a single wallet row */
  const renderRow = (walletName) => {
    const key = nameKey(walletName);
    const connector = findConnector(walletName);
    const icon = getIcon(key, connector);
    const isLoading = connector && connectingId === connector.uid;
    const isRecent = lastConnected === walletName;
    const isBroken = imgErrors[walletName];

    return (
      <button
        key={walletName}
        className="wm-row"
        onClick={() => handleConnect(walletName)}
        disabled={isPending && connectingId !== null}
      >
        {icon && !isBroken ? (
          <img
            className="wm-row-icon"
            src={icon}
            alt={walletName}
            onError={() => handleImgError(walletName)}
          />
        ) : (
          <LetterCircle name={walletName} walletKey={key} />
        )}
        <div className="wm-row-info">
          <span className="wm-row-name">{walletName}</span>
          {isRecent && <span className="wm-row-recent">Recent</span>}
        </div>
        {isLoading && <span className="wm-row-spinner" />}
      </button>
    );
  };

  const GET_WALLETS = [
    { name: 'Rainbow', icon: WALLET_ICONS.rainbow, key: 'rainbow', url: 'https://rainbow.me/download' },
    { name: 'Coinbase Wallet', icon: WALLET_ICONS.coinbase, key: 'coinbase', url: 'https://www.coinbase.com/wallet/downloads' },
    { name: 'MetaMask', icon: WALLET_ICONS.metamask, key: 'metamask', url: 'https://metamask.io/download/' },
  ];

  return (
    <div className="overlay wm-overlay" onClick={onClose}>
      <section
        className="panel wm-panel"
        role="dialog"
        aria-modal="true"
        aria-label={view === 'list' ? 'Connect a wallet' : 'Get a wallet'}
        onClick={(e) => e.stopPropagation()}
      >
        <Ribbon tone="blue">{view === 'list' ? 'Connect wallet' : 'Get a wallet'}</Ribbon>
        <button type="button" className="rbtn rbtn--red rbtn--sm panel-close" onClick={onClose} aria-label="Close">
          <X size={22} strokeWidth={4} />
        </button>

        {view === 'list' ? (
          <>
            <p className="panel-sub">Your wallet is your login. No email, no password.</p>

            <div className="wm-wallet-list">
              {installedWallets.length > 0 && (
                <div className="wm-group">
                  <div className="wm-section-label">Found in this browser</div>
                  {installedWallets.map(renderRow)}
                </div>
              )}
              <div className="wm-group">
                <div className="wm-section-label">{installedWallets.length > 0 ? 'More wallets' : 'Wallets'}</div>
                {popularWallets.map(renderRow)}
              </div>
            </div>

            <div className="wm-new">
              <span>New to wallets?</span>
              <button type="button" className="gbtn gbtn--violet gbtn--sm" onClick={() => setView('get')}>
                <span className="stroke">Get one</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="panel-sub">A wallet holds your crypto and signs you in. These work great on Base.</p>

            <div className="wm-wallet-list">
              <div className="wm-group">
                {GET_WALLETS.map((w) => (
                  <div key={w.name} className="wm-row wm-row--static">
                    {!imgErrors[w.name] ? (
                      <img className="wm-row-icon" src={w.icon} alt="" onError={() => handleImgError(w.name)} />
                    ) : (
                      <LetterCircle name={w.name} walletKey={w.key} />
                    )}
                    <div className="wm-row-info">
                      <span className="wm-row-name">{w.name}</span>
                      <span className="wm-row-desc">App and browser extension</span>
                    </div>
                    <button type="button" className="gbtn gbtn--sm" onClick={() => window.open(w.url, '_blank')}>
                      <span className="stroke">Get</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="wm-new">
              <button type="button" className="link-btn" onClick={() => setView('list')}>
                <ChevronLeft size={18} strokeWidth={3} style={{ verticalAlign: '-3px' }} /> Back to wallets
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
