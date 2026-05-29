import { useState, useCallback } from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { Settings, X, Wallet as WalletIcon, Hourglass } from 'lucide-react';
import { useGameLogic } from './useGameLogic';
import { useLeaderboard } from './useLeaderboard';
import { useDailyCheckIn } from './useDailyCheckIn';
import { MAX_LEVEL } from './constants';
import { BUILDER_CODE } from './wagmi-config';
import './index.css';

import baseLogo from './assets/base app logo.png';
import metamaskLogo from './assets/metamask logo.png';
import phantomLogo from './assets/phantom wallet logo.png';

const getWalletAsset = (connector) => {
  const name = connector.name.toLowerCase();
  const id = connector.id.toLowerCase();

  if (name.includes('coinbase') || id.includes('coinbase')) {
    return { name: 'Base App / Coinbase Wallet', src: baseLogo };
  } else if (name.includes('metamask') || id.includes('metamask')) {
    return { name: 'MetaMask', src: metamaskLogo };
  } else if (name.includes('phantom') || id.includes('phantom')) {
    return { name: 'Phantom Wallet', src: phantomLogo };
  } else {
    return {
      name: connector.name === 'Injected' ? 'Browser Extension' : connector.name,
      src: null
    };
  }
};

// ── GameBoard component ─────────────────────────────────────────
function GameBoard({ level, username, onWin, onLose, onGoHome }) {
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const {
    board, score, moves, targetScore, isProcessing,
    handleDragStart, handleDragOver, handleDragEnter, handleDragEnd
  } = useGameLogic(level, onWin, onLose);

  const progress = targetScore > 0 ? Math.min(100, (score / targetScore) * 100) : 0;

  return (
    <>
      <div className="game-layout">
        {/* Full-width white HUD bar */}
        <div className="hud-bar">
          <div className="hud-col left">
            <span className="hud-label">LEVEL</span>
            <span className="hud-value">{level}</span>
          </div>

          <div className="hud-col center">
            <span className="hud-label">SCORE</span>
            <span className="hud-value">{score}</span>
            <div className="hud-progress-wrap">
              <div className="hud-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="hud-target">Target: {targetScore}</span>
          </div>

          <div className="hud-col right">
            <div>
              <span className="hud-label" style={{ display: 'block', textAlign: 'right' }}>MOVES</span>
              <span className={`hud-value ${moves <= 5 ? 'danger' : ''}`}>{moves}</span>
            </div>
            <button className="btn-icon" onClick={() => { setIsPaused(true); setShowSettings(true); }}>
              <Settings size={28} />
            </button>
          </div>
        </div>

        {/* Username with avatar below HUD */}
        <div className="user-tag">
          <div className="avatar">{username.charAt(0).toUpperCase()}</div>
          {username}
        </div>

        {/* Game Grid */}
        <div className="board-area">
          <div className="board">
            {board.map((tileImage, index) => (
              <div
                key={index}
                className={`tile ${!tileImage ? 'empty' : ''}`}
                style={{
                  backgroundImage: tileImage ? `url(${tileImage})` : 'none',
                  opacity: isPaused ? 0.4 : 1,
                  pointerEvents: isPaused ? 'none' : 'auto',
                }}
                draggable={!!tileImage && !isPaused && !isProcessing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => {
                  if (isPaused || isProcessing) return;
                  handleDragStart(e, index);
                }}
                onTouchMove={(e) => {
                  if (isPaused || isProcessing) return;
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  if (el && el.dataset.index !== undefined) {
                    handleDragEnter(e, parseInt(el.dataset.index, 10));
                  }
                }}
                onTouchEnd={(e) => {
                  if (isPaused || isProcessing) return;
                  handleDragEnd(e);
                }}
                data-index={index}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Settings Modal (Bonus) */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="modal-title">Paused</h2>
            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button className="btn-pill btn-primary" onClick={() => { setShowSettings(false); setIsPaused(false); }}>
                Resume
              </button>
              <button className="btn-pill btn-outline" onClick={onGoHome}>
                Quit to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Leaderboard Panel ───────────────────────────────────────────
function LeaderboardPanel({ entries, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 className="modal-title" style={{ fontSize: '1.6rem' }}>🏆 Leaderboard</h2>
        {entries.length === 0 ? (
          <p className="modal-score-text">No scores yet. Play a level!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '0.8rem', color: '#7f8c8d' }}>#</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '0.8rem', color: '#7f8c8d' }}>Player</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '0.8rem', color: '#7f8c8d' }}>Score</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '0.8rem', color: '#7f8c8d' }}>Lvl</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 10).map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.username}
                    {e.wallet && e.wallet !== '0x0000' && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#7f8c8d' }}>
                        {e.wallet.slice(0, 6)}…{e.wallet.slice(-4)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{e.score}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', color: '#7f8c8d' }}>{e.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-pill btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState('HOME');
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState(1);
  const [lastScore, setLastScore] = useState(0);
  const [lastTarget, setLastTarget] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Wagmi wallet state
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Leaderboard
  const { entries: leaderboardEntries, submitScore } = useLeaderboard();

  // Daily check-in (keyed on connected wallet address)
  const { hasCheckedInToday, streak, checkIn, isCheckingIn, timeUntilNextCheckIn, isCooldownActive } = useDailyCheckIn(address);

  // ── Callbacks ──
  const handleWin = useCallback((score, target) => {
    setLastScore(score);
    setLastTarget(target);
    setScreen('LEVEL_COMPLETE');
  }, []);

  const handleLose = useCallback((score, target) => {
    setLastScore(score);
    setLastTarget(target);
    setScreen('GAME_OVER');
  }, []);

  const goHome = useCallback(() => setScreen('HOME'), []);

  const startGame = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setLevel(1);
      setScreen('PLAYING');
    }
  };

  const nextLevel = () => {
    // Submit score to leaderboard on level completion
    submitScore({
      wallet: address || '0x0000',
      username,
      score: lastScore,
      level,
    });
    setLevel(l => Math.min(l + 1, MAX_LEVEL));
    setScreen('PLAYING');
  };

  const retryLevel = () => {
    setScreen('_RESET');
    requestAnimationFrame(() => setScreen('PLAYING'));
  };

  // ============ SCREEN 1: LOGIN / HOME ============
  if (screen === 'HOME') {
    return (
      <div className="login-wrapper">
        <div className="login-screen">
          {/* Wallet connect at the top */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 12 }}>
            {isConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.9rem', color: '#66bb6a', fontWeight: 800 }}>
                  ✅ Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  className="btn-pill btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.9rem', width: 'auto' }}
                  onClick={() => disconnect()}
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <button
                className="btn-pill btn-outline"
                style={{ padding: '10px 20px', width: 'auto' }}
                onClick={() => setShowWalletModal(true)}
              >
                Connect Wallet
              </button>
            )}
          </div>

          <div className="login-icon">🍬</div>
          <h1 className="login-title">Nads Smash</h1>
          <p className="login-tagline">Match · Blast · Conquer</p>

          {/* Leaderboard button */}
          <button
            className="btn-pill btn-outline"
            style={{ marginBottom: 20 }}
            onClick={() => setShowLeaderboard(true)}
          >
            🏆 Leaderboard
          </button>

          {/* Daily Check-In button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <button
              className="btn-pill btn-outline"
              style={{
                cursor: (isConnected && isCooldownActive) ? 'default' : 'pointer',
                opacity: (isConnected && isCheckingIn) ? 0.7 : 1,
                marginBottom: 0,
              }}
              disabled={isConnected && (isCheckingIn || isCooldownActive)}
              onClick={() => {
                if (!isConnected) {
                  alert('Please connect your wallet to check in!');
                } else {
                  checkIn();
                }
              }}
            >
              📅 {!isConnected ? 'Daily Check-In' :
                isCheckingIn ? 'Checking in…' :
                  (hasCheckedInToday || isCooldownActive) ? 'Checked In Today' :
                    'Daily Check-In'}
            </button>

            {isConnected && (streak > 0 || isCooldownActive) && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px 16px',
                marginTop: 12,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.95rem' }}>
                  🔥 Streak: {streak} {streak === 1 ? 'Day' : 'Days'}
                </span>
                {isCooldownActive && timeUntilNextCheckIn ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                    <Hourglass size={14} />
                    <span style={{ fontSize: '0.8rem', fontFamily: '"Roboto Mono", "Courier New", monospace', fontWeight: 600 }}>
                      {timeUntilNextCheckIn}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#66bb6a', fontWeight: 700 }}>
                    Check-in available!
                  </span>
                )}
              </div>
            )}
          </div>

          <form onSubmit={startGame}>
            <div className="login-form-group">
              <label className="login-label">YOUR NAME</label>
              <input
                type="text"
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-pill"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn-pill btn-primary">
              Start Game &rarr;
            </button>
          </form>

          {/* Builder code tag (visible for transparency) */}
          <p style={{ marginTop: 16, fontSize: '0.7rem', color: '#bdbdbd' }}>
            Builder: {BUILDER_CODE}
          </p>
        </div>

        {/* Leaderboard modal */}
        {showLeaderboard && (
          <LeaderboardPanel
            entries={leaderboardEntries}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {/* Wallet connection modal */}
        {showWalletModal && !isConnected && (
          <div className="modal-overlay">
            <div className="modal-card" style={{ padding: '30px 30px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 className="modal-title" style={{ fontSize: '1.4rem', margin: 0, textAlign: 'left' }}>Select a Wallet</h2>
                <button
                  onClick={() => setShowWalletModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7f8c8d' }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Wallet Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                  const cbConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
                  const others = connectors.filter(c => !c.name.toLowerCase().includes('coinbase'));

                  return (
                    <>
                      {/* Coinbase Wallet Top Priority */}
                      {cbConnector && (() => {
                        const { name, src } = getWalletAsset(cbConnector);
                        return (
                          <button
                            key={cbConnector.uid}
                            onClick={() => {
                              connect({ connector: cbConnector });
                              setShowWalletModal(false);
                            }}
                            disabled={isPending}
                            className="btn-pill btn-outline"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                              padding: '12px 20px', gap: 16,
                              background: 'rgba(0, 82, 255, 0.05)', borderColor: '#0052FF'
                            }}
                          >
                            {src ? (
                              <img src={src} alt={name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'contain' }} />
                            ) : (
                              <WalletIcon size={32} color="#0052FF" />
                            )}
                            <span style={{ fontWeight: 800, color: '#0052FF' }}>{name}</span>
                          </button>
                        );
                      })()}

                      {/* Divider */}
                      {others.length > 0 && cbConnector && (
                        <div style={{ height: 1, background: '#e0e0e0', margin: '8px 0' }} />
                      )}

                      {/* Other Wallets */}
                      {others.map(c => {
                        const { name, src } = getWalletAsset(c);

                        return (
                          <button
                            key={c.uid}
                            onClick={() => {
                              connect({ connector: c });
                              setShowWalletModal(false);
                            }}
                            disabled={isPending}
                            className="btn-pill btn-outline"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                              padding: '12px 20px', gap: 16
                            }}
                          >
                            {src ? (
                              <img src={src} alt={name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'contain' }} />
                            ) : (
                              <WalletIcon size={32} color="#7f8c8d" />
                            )}
                            <span style={{ fontWeight: 700, color: '#2c3e50' }}>{name}</span>
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ SCREEN 2: GAME ============
  if (screen === 'PLAYING') {
    return (
      <GameBoard
        key={`level-${level}`}
        level={level}
        username={username}
        onWin={handleWin}
        onLose={handleLose}
        onGoHome={goHome}
      />
    );
  }

  // ============ SCREEN 3: LEVEL COMPLETE ============
  if (screen === 'LEVEL_COMPLETE') {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="stars">⭐⭐⭐</div>
          <h2 className="modal-title">Level Complete!</h2>
          <p className="modal-score-text">Score: {lastScore} / Target: {lastTarget}</p>
          {isConnected && (
            <p style={{ fontSize: '0.8rem', color: '#66bb6a', fontWeight: 600, marginBottom: 12 }}>
              ✅ Score will be submitted to leaderboard
            </p>
          )}
          <div className="modal-actions">
            <button className="btn-pill btn-primary" onClick={nextLevel}>
              Next Level &rarr;
            </button>
            <button className="btn-pill btn-outline" onClick={retryLevel}>
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ GAME OVER ============
  if (screen === 'GAME_OVER') {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <h2 className="modal-title" style={{ color: '#e53935' }}>Out of Moves!</h2>
          <p className="modal-score-text">Score: {lastScore} / Target: {lastTarget}</p>
          <div className="modal-actions" style={{ marginTop: 24 }}>
            <button className="btn-pill btn-primary" onClick={retryLevel}>
              Try Again
            </button>
            <button className="btn-pill btn-outline" onClick={goHome}>
              Quit to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
