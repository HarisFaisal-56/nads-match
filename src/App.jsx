import { useState, useCallback } from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { Settings, X, Wallet as WalletIcon, Hourglass, LogOut } from 'lucide-react';
import { useGameLogic } from './useGameLogic';
import { useLeaderboard } from './useLeaderboard';
import { useOnChainLeaderboard } from './useOnChainLeaderboard';
import { useDailyCheckIn } from './useDailyCheckIn';
import { MAX_LEVEL } from './constants';
import GameOver from './GameOver';
import LevelComplete from './LevelComplete';
import { BUILDER_CODE } from './wagmi-config';
import './index.css';

import baseLogo from './assets/base app logo.png';
import metamaskLogo from './assets/metamask logo.png';
import phantomLogo from './assets/phantom wallet logo.png';
import gameLogo from './assets/game-logo.png';

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
function LeaderboardPanel({ entries, onClose, isLoading }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxHeight: '80vh', overflowY: 'auto', background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
        <h2 className="modal-title" style={{ fontSize: '1.6rem' }}>🏆 Leaderboard</h2>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #bae6fd', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 12, fontWeight: 600 }}>Loading scores from Base…</p>
          </div>
        ) : entries.length === 0 ? (
          <p className="modal-score-text">No scores yet. Play a level and submit on-chain!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: ' 2px solid rgba(56, 189, 248, 0.5)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '0.8rem', color: '#7f8c8d' }}>#</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '0.8rem', color: '#7f8c8d' }}>Player</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '0.8rem', color: '#7f8c8d' }}>Score</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '0.8rem', color: '#7f8c8d' }}>Lvl</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 10).map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  < td style={{ padding: '8px 4px', fontWeight: 700 }}>{i + 1}</td>
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
        )
        }
        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-pill btn-primary" onClick={onClose}>Close</button>
        </div>
      </div >
    </div >
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

  // Leaderboard (local — kept for submitScore only)
  const { submitScore } = useLeaderboard();

  // On-chain leaderboard (for display)
  const { entries: leaderboardEntries, isLoading: isLeaderboardLoading } = useOnChainLeaderboard();

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
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)'
      }}>

        <style>{`
          .neon-btn {
            transition: all 0.2s ease !important;
            background: rgba(0,0,0,0.3) !important;
          }
          .neon-btn-amber {
            border: 1px solid #f59e0b !important;
            color: #fcd34d !important;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.3) !important;
          }
          .neon-btn-amber:hover {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.6) !important;
            transform: translateY(-2px);
          }
          .neon-btn-green {
            border: 1px solid #22c55e !important;
            color: #86efac !important;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.3) !important;
          }
          .neon-btn-green:hover {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.6) !important;
            transform: translateY(-2px);
          }
          .neon-btn-primary {
            background: linear-gradient(135deg, #3b82f6, #a855f7) !important;
            color: white !important;
            border: none !important;
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.5) !important;
          }
          .neon-btn-primary:hover {
            box-shadow: 0 0 25px rgba(168, 85, 247, 0.8) !important;
            transform: translateY(-2px) scale(1.02);
          }
          .neon-btn-disabled {
            background: #374151 !important;
            color: #9ca3af !important;
            border: none !important;
            box-shadow: none !important;
            cursor: not-allowed !important;
          }
          .neon-input {
            background: rgba(0,0,0,0.3) !important;
            border: 1px solid #3b82f6 !important;
            color: #ffffff !important;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.3) !important;
            transition: all 0.2s ease !important;
          }
          .neon-input::placeholder {
            color: #9ca3af !important;
          }
          .neon-input:focus {
            outline: none !important;
            border-color: #a855f7 !important;
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.5) !important;
          }
          .logout-btn-hover {
            transition: all 0.2s ease;
          }
          .logout-btn-hover:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 0 5px rgba(168, 85, 247, 0.6));
          }
        `}</style>

        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: '420px',
          margin: 'auto',
          height: 'auto',
          background: 'linear-gradient(to bottom, #00001a, #00003d)',
          borderRadius: '24px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          boxSizing: 'border-box',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)',
        }}>

          {/* ONLY show when connected */}
          {isConnected && (
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px'
            }}>
              <span style={{ color: '#4ade80', fontWeight: '800' }}>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              <button
                onClick={() => disconnect()}
                className="logout-btn-hover"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <LogOut size={18} color="#9ca3af" />
              </button>
            </div>
          )}

          {/* Logo - always show */}
          <img src={gameLogo} alt="Nads Smash" style={{ width: '80px', height: '80px', borderRadius: '16px', margin: '0' }} />
          {/* Title - always show */}
          <h1 style={{
            fontSize: '26px',
            fontWeight: 'bold',
            margin: '0',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Nads Smash</h1>

          {/* Tagline - always show */}
          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
            margin: '0',
            textAlign: 'center',
            letterSpacing: '2px'
          }}>Match · Blast · Conquer</p>

          {/* ONLY show when connected */}
          {isConnected && (
            <>
              {/* Leaderboard button */}
              <button
                className="btn-pill neon-btn neon-btn-amber"
                style={{ width: '100%', margin: '0', padding: '10px 16px', fontSize: '14px' }}
                onClick={() => setShowLeaderboard(true)}
              >
                🏆 Leaderboard
              </button>

              {/* Checkin button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px' }}>
                <button
                  className="btn-pill neon-btn neon-btn-green"
                  style={{
                    cursor: isCooldownActive ? 'default' : 'pointer',
                    opacity: isCheckingIn ? 0.7 : 1,
                    width: '100%',
                    margin: '0',
                    padding: '10px 16px',
                    fontSize: '14px'
                  }}
                  disabled={isCheckingIn || isCooldownActive}
                  onClick={() => checkIn()}
                >
                  📅 {isCheckingIn ? 'Checking in…' :
                    (hasCheckedInToday || isCooldownActive) ? 'Checked In Today' :
                      'Daily Check-In'}
                </button>

                {(streak > 0 || isCooldownActive) && (
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid #f97316',
                    boxShadow: '0 0 10px rgba(249, 115, 22, 0.3)',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ fontWeight: 800, color: '#f97316', fontSize: '0.9rem' }}>
                      🔥 Streak: {streak} {streak === 1 ? 'Day' : 'Days'}
                    </span>
                    {isCooldownActive && timeUntilNextCheckIn ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                        <Hourglass size={12} color="#fdba74" />
                        <span style={{ fontSize: '0.75rem', color: '#fdba74', fontFamily: '"Roboto Mono", "Courier New", monospace', fontWeight: 600 }}>
                          {timeUntilNextCheckIn}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                        Check-in available!
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Form container for name and start button */}
              <form onSubmit={startGame} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* YOUR NAME label */}
                <div style={{ width: '100%' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#c084fc', marginBottom: '4px', marginLeft: '12px', letterSpacing: '2px', textAlign: 'left', textTransform: 'uppercase' }}>
                    YOUR NAME
                  </label>
                  {/* Name input */}
                  <input
                    type="text"
                    placeholder="Enter username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-pill neon-input"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 16px', fontSize: '14px' }}
                    autoFocus
                  />
                  {username.trim() === "" && (
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: '4px', marginBottom: '0' }}>
                      Enter a name to continue
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!username.trim()}
                  className={username.trim() ? "btn-pill neon-btn-primary" : "btn-pill neon-btn-disabled"}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '50px',
                    fontSize: '15px',
                    fontWeight: '600',
                    marginTop: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Start Game →
                </button>
              </form>
            </>
          )}

          {/* Bottom button - conditional */}
          {!isConnected && (
            <button
              onClick={() => setShowWalletModal(true)}
              className="btn-pill neon-btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '50px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              🔗 Connect Wallet
            </button>
          )}

          {/* Builder text - always show */}
          <p style={{ fontSize: '10px', color: '#60a5fa', margin: '0', textShadow: '0 0 8px rgba(96, 165, 250, 0.8)', fontWeight: '600', letterSpacing: '1px' }}>
            Built on Base
          </p>

        </div>


        {/* Leaderboard modal */}
        {showLeaderboard && (
          <LeaderboardPanel
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
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
                              <img src={src} alt={name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'contain', flexShrink: 0 }} />
                            ) : (
                              <WalletIcon size={32} color="#0052FF" style={{ flexShrink: 0 }} />
                            )}
                            <span style={{ fontWeight: 800, color: '#0052FF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{name}</span>
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
                              <img src={src} alt={name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'contain', flexShrink: 0 }} />
                            ) : (
                              <WalletIcon size={32} color="#7f8c8d" style={{ flexShrink: 0 }} />
                            )}
                            <span style={{ fontWeight: 700, color: '#2c3e50', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{name}</span>
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
      <LevelComplete
        score={lastScore}
        targetScore={lastTarget}
        level={level}
        onNextLevel={nextLevel}
        onRetry={retryLevel}
      />
    );
  }

  // ============ GAME OVER ============
  if (screen === 'GAME_OVER') {
    return (
      <GameOver
        score={lastScore}
        targetScore={lastTarget}
        level={level}
        onRetry={retryLevel}
        onGoHome={goHome}
      />
    );
  }

  return null;
}

export default App;
