import { useState, useCallback, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { LogOut, Trophy, Flame, Check, Gift, Play } from 'lucide-react';
import { useLeaderboard } from './useLeaderboard';
import { useOnChainLeaderboard } from './useOnChainLeaderboard';
import { useDailyCheckIn } from './useDailyCheckIn';
import { MAX_LEVEL, CANDY_IMAGES } from './constants';
import GameBoard from './GameBoard';
import GameOver from './GameOver';
import LevelComplete from './LevelComplete';
import Leaderboard from './Leaderboard';
import WalletModal from './WalletModal';
import { OText, Ribbon, Floaters } from './ui';
import { identicon, shortAddr } from './ui-utils';
import './index.css';

// where the nads float around the lobby (decorative)
const GUEST_FLOATERS = [
  { img: 0, x: '14%', y: '20%', size: 96, rot: -12, delay: 0.2, wide: true },
  { img: 4, x: '80%', y: '16%', size: 88, rot: 10, delay: 1.0, wide: true },
  { img: 6, x: '10%', y: '58%', size: 84, rot: 8, delay: 1.8, wide: true },
  { img: 1, x: '84%', y: '54%', size: 92, rot: -9, delay: 0.6, wide: true },
  { img: 3, x: '-24px', y: '38%', size: 62, rot: 12, delay: 0.8, op: 0.8 },
  { img: 7, x: 'calc(100% - 40px)', y: '44%', size: 66, rot: -12, delay: 0.4, op: 0.8 },
  { img: 2, x: '-20px', y: 'calc(100% - 46px)', size: 60, rot: 8, delay: 1.2, op: 0.7 },
  { img: 8, x: 'calc(100% - 44px)', y: 'calc(100% - 52px)', size: 64, rot: -6, delay: 2, op: 0.7 },
];
const PLAYER_FLOATERS = [
  { img: 0, x: '14%', y: '20%', size: 96, rot: -12, delay: 0.2, wide: true },
  { img: 4, x: '80%', y: '16%', size: 88, rot: 10, delay: 1.0, wide: true },
  { img: 6, x: '10%', y: '58%', size: 84, rot: 8, delay: 1.8, wide: true },
  { img: 1, x: '84%', y: '54%', size: 92, rot: -9, delay: 0.6, wide: true },
  { img: 2, x: '-22px', y: 'calc(100% - 50px)', size: 62, rot: 8, delay: 1.2, op: 0.7 },
  { img: 8, x: 'calc(100% - 46px)', y: 'calc(100% - 56px)', size: 66, rot: -6, delay: 2, op: 0.7 },
];

// nads peeking out from behind the logo
const PEEKS = [
  { img: 6, left: '-30px', top: '-14px', s: '58px', rot: '-16deg', d: '0.3s' },
  { img: 1, right: '-34px', top: '8px', s: '52px', rot: '14deg', d: '1.1s' },
  { img: 4, right: '-18px', bottom: '-18px', s: '46px', rot: '-8deg', d: '0.7s' },
];

function Logo() {
  return (
    <h1 className="logo" aria-label="Nads Smash">
      {PEEKS.map((p, i) => (
        <span
          key={i}
          className="peek"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${CANDY_IMAGES[p.img]})`,
            left: p.left, right: p.right, top: p.top, bottom: p.bottom,
            '--s': p.s, rotate: p.rot, '--d': p.d,
          }}
        />
      ))}
      <OText variant="pink" className="logo-top" aria-hidden="true">Nads</OText>
      <OText className="logo-bottom" aria-hidden="true">Smash</OText>
    </h1>
  );
}

// ── Daily check-in calendar ─────────────────────────────────────
function DailyCheckIn({ streak, hasCheckedInToday, isCooldownActive, isCheckingIn, timeUntilNextCheckIn, onCheckIn }) {
  const doneToday = hasCheckedInToday || isCooldownActive;
  // progress through the current 7-day week of the streak
  const doneCount = doneToday ? (streak > 0 ? ((streak - 1) % 7) + 1 : 0) : streak % 7;
  const todayIdx = doneToday ? -1 : doneCount;

  return (
    <section className="panel daily" aria-label="Daily check-in">
      <Ribbon tone="blue">Daily check-in</Ribbon>

      <div className="days" style={{ marginTop: 14 }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const state = i < doneCount ? 'is-done' : i === todayIdx ? 'is-today' : 'is-locked';
          return (
            <div key={i} className={`day ${state}`}>
              <span className="day-icon">
                {state === 'is-done' ? (
                  <Check size={20} strokeWidth={4} color="var(--plum)" />
                ) : (
                  <Gift size={19} strokeWidth={2.6} color={state === 'is-today' ? 'var(--plum)' : '#B3A6DA'} />
                )}
              </span>
              <span>Day {i + 1}</span>
            </div>
          );
        })}
      </div>

      <div className="daily-foot">
        <span className="streak-text">
          <Flame size={22} color="var(--pink-2)" fill="var(--gold-1)" strokeWidth={2.5} aria-hidden="true" />
          <b>{streak}</b> day streak
        </span>

        {doneToday ? (
          timeUntilNextCheckIn ? (
            <span className="timer">
              <small>Next check-in in</small>
              <span>{timeUntilNextCheckIn}</span>
            </span>
          ) : (
            <span className="timer"><small>Checked in today</small></span>
          )
        ) : (
          <button
            type="button"
            className={`gbtn gbtn--sm ${isCheckingIn ? 'is-busy' : ''}`}
            onClick={onCheckIn}
            disabled={isCheckingIn}
          >
            {isCheckingIn && <span className="spinner" />}
            <span className="stroke">{isCheckingIn ? 'Checking in' : 'Check in'}</span>
          </button>
        )}
      </div>
    </section>
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
  const [nudge, setNudge] = useState(0);
  const nameRef = useRef(null);

  // Wagmi wallet state
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Leaderboard (local — kept for submitScore only)
  const { submitScore } = useLeaderboard();

  // On-chain leaderboard (for display)
  const { entries: leaderboardEntries, isLoading: isLeaderboardLoading, error: leaderboardError, refetch: refetchLeaderboard } = useOnChainLeaderboard();

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
    } else {
      // no name yet: shake the field and put the cursor in it
      setNudge((n) => n + 1);
      nameRef.current?.focus();
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

  const openLeaderboard = () => { refetchLeaderboard(); setShowLeaderboard(true); };

  // ============ SCREEN 1: HOME ============
  if (screen === 'HOME') {
    return (
      <main className="scene">
        <Floaters images={CANDY_IMAGES} spots={isConnected ? PLAYER_FLOATERS : GUEST_FLOATERS} />

        <div className={`lobby ${isConnected ? 'is-player' : 'is-guest'}`}>
          <div className="lobby-top">
            {isConnected && (
              <span className="pill">
                <span className="pill-avatar" style={identicon(address)} aria-hidden="true" />
                <span>{shortAddr(address)}</span>
                <span className="live-dot" aria-label="Connected" />
              </span>
            )}
            <span className="spacer" />
            <button type="button" className="rbtn rbtn--gold" onClick={openLeaderboard} aria-label="Leaderboard">
              <Trophy size={24} strokeWidth={2.8} />
            </button>
            {isConnected && (
              <button type="button" className="rbtn" onClick={() => disconnect()} aria-label="Disconnect wallet">
                <LogOut size={21} strokeWidth={3} />
              </button>
            )}
          </div>

          <Logo />

          {isConnected ? (
            <>
              <DailyCheckIn
                streak={streak}
                hasCheckedInToday={hasCheckedInToday}
                isCooldownActive={isCooldownActive}
                isCheckingIn={isCheckingIn}
                timeUntilNextCheckIn={timeUntilNextCheckIn}
                onCheckIn={() => checkIn()}
              />

              <form className="play-box" onSubmit={startGame} noValidate>
                <div key={nudge} className={`name-field ${nudge ? 'is-nudged' : ''}`}>
                  <label htmlFor="player-name">Your nickname</label>
                  <input
                    ref={nameRef}
                    id="player-name"
                    type="text"
                    className="name-input"
                    placeholder="Type a name…"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    maxLength={15}
                    autoComplete="nickname"
                    autoFocus
                  />
                </div>

                <button type="submit" className="gbtn gbtn--xl">
                  <Play size={30} strokeWidth={3} fill="#fff" style={{ filter: 'drop-shadow(0 2px 0 var(--plum))' }} />
                  <span className="stroke">Play</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="hand" aria-hidden="true">
                {[[0, '-20deg', '0.25s'], [5, '0deg', '0.35s'], [7, '20deg', '0.45s']].map(([img, r, d]) => (
                  <span key={img} className="hand-card" style={{ backgroundImage: `url(${CANDY_IMAGES[img]})`, '--r': r, '--d': d }} />
                ))}
              </div>
              <p className="tagline">Swap the nads, chain big combos and get your score on the Base leaderboard.</p>
              <div className="lobby-cta">
                <button type="button" className="gbtn gbtn--xl" onClick={() => setShowWalletModal(true)}>
                  <span className="stroke">Connect wallet</span>
                </button>
                <p className="fineprint">Free to play. Check-ins and posting scores cost a little gas.</p>
              </div>
            </>
          )}

          <footer className="lobby-foot">
            <span className="base-mark"><i aria-hidden="true" />Built on Base</span>
          </footer>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <Leaderboard
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
            error={leaderboardError}
            me={address}
            onRetry={refetchLeaderboard}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {/* Wallet connection modal */}
        <WalletModal
          isOpen={showWalletModal && !isConnected}
          onClose={() => setShowWalletModal(false)}
        />
      </main>
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
