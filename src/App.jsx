import { useState, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { useGameLogic } from './useGameLogic';
import { MAX_LEVEL } from './constants';
import './index.css';

// GameBoard component
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

function App() {
  const [screen, setScreen] = useState('HOME');
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState(1);
  const [lastScore, setLastScore] = useState(0);
  const [lastTarget, setLastTarget] = useState(0);

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
    setLevel(l => Math.min(l + 1, MAX_LEVEL));
    setScreen('PLAYING');
  };

  const retryLevel = () => {
    setScreen('_RESET');
    requestAnimationFrame(() => setScreen('PLAYING'));
  };

  // ============ SCREEN 1: LOGIN ============
  if (screen === 'HOME') {
    return (
      <div className="login-wrapper">
        <div className="login-screen">
          <div className="login-icon">🍬</div>
          <h1 className="login-title">Nads Smash</h1>
          <p className="login-tagline">Match · Blast · Conquer</p>
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
        </div>
      </div>
    );
  }

  // ============ SCREEN 2: GAME ============
  if (screen === 'PLAYING') {
    return (
      <GameBoard
        key={`level-${level}-${Date.now()}`}
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










