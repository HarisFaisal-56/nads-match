import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnect } from 'wagmi';
import './WalletModal.css';

import phantomIcon from './assets/phantom.png';
import hahaIcon from './assets/haha.png';
import walletConnectIcon from './assets/walletconnect.png';
import assetsIcon from './assets/login-keyhole.svg';
import loginIcon from './assets/assets-grid.svg';
/* ─── Icon URLs ───────────────────────────────────────────────── */
const WALLET_ICONS = {
  metamask:
    'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
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



/** Home icon for feature block 1 — rendered inside gradient square */
function HomeIcon() {
  return (
    <div className="wm-feature-icon-box wm-feature-icon-box--home">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </div>
  );
}

/** Key icon for feature block 2 — rendered inside gradient square */
function KeyIcon() {
  return (
    <div className="wm-feature-icon-box wm-feature-icon-box--key">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────── */

export default function WalletModal({ isOpen, onClose }) {
  const { connect, connectors, isPending } = useConnect();
  const [connectingId, setConnectingId] = useState(null);
  const [imgErrors, setImgErrors] = useState({});  // track broken images
  const [rightView, setRightView] = useState('info'); // 'info' | 'get'

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
      setRightView('info');
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

  return (
    <div className="wm-overlay" onClick={onClose}>
      <div className="wm-container" onClick={(e) => e.stopPropagation()}>

        {/* ─── Left Panel: wallet list ─── */}
        <div className="wm-left">
          <div className="wm-left-header">Connect a Wallet</div>

          <div className="wm-wallet-list">
            {/* Installed section */}
            {installedWallets.length > 0 && (
              <>
                <div className="wm-section-label">Installed</div>
                {installedWallets.map(renderRow)}
                <hr className="wm-divider" />
              </>
            )}

            {/* Popular section */}
            <div className={`wm-section-label ${installedWallets.length > 0 ? 'popular' : ''}`}>Popular</div>
            {popularWallets.map(renderRow)}
          </div>
        </div>

        {/* ─── Right Panel: info or get ─── */}
        <div className="wm-right">
          {/* Close button */}
          <button className="wm-close" onClick={onClose} aria-label="Close">&times;</button>
          
          {rightView === 'info' ? (
            <>
              <div className="wm-right-header">What is a Wallet?</div>

              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                <img src={assetsIcon} alt="Digital Assets" className="wm-feature-icon-img" />
                <div>
                  <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0', lineHeight: 1.3 }}>A Home for your Digital Assets</p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.55, margin: 0 }}>Wallets are used to send, receive, store, and display digital assets like Ethereum and NFTs.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                <img src={loginIcon} alt="Log In" className="wm-feature-icon-img" />
                <div>
                  <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0', lineHeight: 1.3 }}>A New Way to Log In</p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.55, margin: 0 }}>Instead of creating new accounts and passwords on every website, just connect your wallet.</p>
                </div>
              </div>

              <button
                className="wm-get-wallet"
                onClick={() => setRightView('get')}
              >
                Get a Wallet
              </button>

              <a
                className="wm-learn-more"
                href="https://learn.rainbow.me/understanding-web3?utm_source=rainbowkit&utm_campaign=learnmore"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn More
              </a>
            </>
          ) : (
            <>
              <div className="wm-right-header wm-get-header">
                <button className="wm-back-btn" onClick={() => setRightView('info')}>&lsaquo;</button>
                Get a Wallet
              </div>

              <div className="wm-get-list">
                <div className="wm-get-row">
                  <img className="wm-get-icon" src={WALLET_ICONS.rainbow} alt="Rainbow" />
                  <div className="wm-get-info">
                    <div className="wm-get-name">Rainbow</div>
                    <div className="wm-get-desc">Mobile Wallet and Extension</div>
                  </div>
                  <button className="wm-get-btn" onClick={() => window.open('https://rainbow.me/download', '_blank')}>GET</button>
                </div>

                <div className="wm-get-row">
                  <img className="wm-get-icon" src={WALLET_ICONS.coinbase} alt="Coinbase Wallet" />
                  <div className="wm-get-info">
                    <div className="wm-get-name">Coinbase Wallet</div>
                    <div className="wm-get-desc">Mobile Wallet and Extension</div>
                  </div>
                  <button className="wm-get-btn" onClick={() => window.open('https://www.coinbase.com/wallet/downloads', '_blank')}>GET</button>
                </div>

                <div className="wm-get-row">
                  <img className="wm-get-icon" src={WALLET_ICONS.metamask} alt="MetaMask" />
                  <div className="wm-get-info">
                    <div className="wm-get-name">MetaMask</div>
                    <div className="wm-get-desc">Mobile Wallet and Extension</div>
                  </div>
                  <button className="wm-get-btn" onClick={() => window.open('https://metamask.io/download/', '_blank')}>GET</button>
                </div>
              </div>

              <div className="wm-get-footer">
                <div className="wm-get-footer-title">Not what you're looking for?</div>
                <div className="wm-get-footer-desc">Select a wallet on the left to get started with a different wallet provider.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
