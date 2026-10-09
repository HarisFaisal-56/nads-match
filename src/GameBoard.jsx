import { useState, useEffect, useRef } from 'react';
import { Pause } from 'lucide-react';
import { useGameLogic } from './useGameLogic';
import { BOARD_SIZE } from './constants';
import SubmitScore from './SubmitScore';
import { OText, StarShape, Ribbon } from './ui';
import { STAR_STEPS, COMBO_WORDS } from './ui-utils';

const SPARKS = [0, 60, 120, 180, 240, 300];
const EMPTY_FX = { gen: 0, cleared: {}, dropped: new Set(), fell: new Set(), swapped: new Set() };

/** Score that counts up instead of jumping. */
function ScoreNum({ value }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return undefined;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 380);
      const v = Math.round(from + (value - from) * (1 - (1 - p) ** 3));
      fromRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span key={value} className="score-num-wrap is-bump" aria-live="polite">
      <OText variant="white" className="score-num">{shown}</OText>
    </span>
  );
}

/** Work out which cells changed between two boards so each can animate. */
function diffBoards(prev, next, gen) {
  const cleared = {};
  const dropped = new Set();
  const changed = [];
  next.forEach((img, i) => {
    const was = prev[i];
    if (was && !img) cleared[i] = was;
    else if (!was && img) dropped.add(i);
    else if (was && img && was !== img) changed.push(i);
  });
  const isSwap =
    changed.length === 2 &&
    Object.keys(cleared).length === 0 &&
    dropped.size === 0 &&
    Math.abs(Math.floor(changed[0] / BOARD_SIZE) - Math.floor(changed[1] / BOARD_SIZE)) +
      Math.abs((changed[0] % BOARD_SIZE) - (changed[1] % BOARD_SIZE)) === 1;
  return {
    gen,
    cleared,
    dropped,
    fell: isSwap ? new Set() : new Set(changed),
    swapped: isSwap ? new Set(changed) : new Set(),
  };
}

function centroid(indices) {
  if (!indices.length) return { x: 50, y: 50 };
  let r = 0;
  let c = 0;
  indices.forEach((i) => {
    r += Math.floor(i / BOARD_SIZE);
    c += i % BOARD_SIZE;
  });
  return {
    x: ((c / indices.length + 0.5) / BOARD_SIZE) * 100,
    y: ((r / indices.length + 0.5) / BOARD_SIZE) * 100,
  };
}

export default function GameBoard({ level, username, onWin, onLose, onGoHome }) {
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const {
    board, score, moves, targetScore, isProcessing,
    handleDragStart, handleDragOver, handleDragEnter, handleDragEnd
  } = useGameLogic(level, onWin, onLose);

  // ── Visual effects, derived from how the board/score/moves change ──
  const [startMoves] = useState(moves);
  const [showIntro, setShowIntro] = useState(true);
  const [prev, setPrev] = useState({ board, score, moves });
  const [fx, setFx] = useState(EMPTY_FX);
  const [combo, setCombo] = useState(0);
  const [floats, setFloats] = useState([]);
  const [callout, setCallout] = useState(null);
  const [shake, setShake] = useState(0);

  if (prev.board !== board || prev.score !== score || prev.moves !== moves) {
    const gen = fx.gen + 1;
    const nextFx = prev.board !== board ? diffBoards(prev.board, board, gen) : fx;
    if (nextFx !== fx) setFx(nextFx);

    let nextCombo = combo;
    if (moves !== prev.moves) nextCombo = 0;

    const gained = score - prev.score;
    if (gained > 0) {
      nextCombo += 1;
      const at = centroid(Object.keys(nextFx.cleared).map(Number));
      setFloats((f) => [...f, { id: `${gen}-${score}`, ...at, text: `+${gained}`, born: gen }]);
      if (gained >= 50) {
        setCallout({ id: gen, text: 'Comet Blast!', variant: 'pink', big: true });
        setShake((s) => s + 1);
      } else if (nextCombo >= 2) {
        setCallout({ id: gen, text: COMBO_WORDS[Math.min(nextCombo, COMBO_WORDS.length - 1)], variant: '' });
      }
    }
    if (nextCombo !== combo) setCombo(nextCombo);
    setPrev({ board, score, moves });
  }

  // tidy up effects once their animations are done
  useEffect(() => {
    if (!floats.length) return undefined;
    const t = setTimeout(() => setFloats((f) => f.slice(1)), 900);
    return () => clearTimeout(t);
  }, [floats]);

  useEffect(() => {
    if (!callout) return undefined;
    const t = setTimeout(() => setCallout(null), 1000);
    return () => clearTimeout(t);
  }, [callout]);

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 1900);
    return () => clearTimeout(t);
  }, []);

  const maxMeter = targetScore * STAR_STEPS[STAR_STEPS.length - 1];
  const meter = maxMeter > 0 ? Math.min(100, (score / maxMeter) * 100) : 0;

  const pause = () => { setIsPaused(true); setShowSettings(true); };
  const resume = () => { setShowSettings(false); setIsPaused(false); };

  return (
    <>
      <main className="scene is-dim">
        <div className="game">
          <header className="hud">
            <div className="hud-top">
              <button type="button" className="rbtn" onClick={pause} aria-label="Pause game">
                <Pause size={22} strokeWidth={3} fill="#fff" />
              </button>
              <span className="pill">
                <span className="name-avatar">{username.charAt(0).toUpperCase()}</span>
                <span>{username}</span>
              </span>
              <OText variant="white" className="level-flag">{`Level ${level}`}</OText>
            </div>

            <div className="hud-panel">
              <div>
                <div className="score-head">
                  <span className="score-label">Score</span>
                  <span className="target-text">Target {targetScore}</span>
                </div>
                <ScoreNum value={score} />
                <div
                  className="meter"
                  role="progressbar"
                  aria-label="Score toward three stars"
                  aria-valuenow={score}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(maxMeter)}
                >
                  <div className="meter-fill" style={{ width: `${meter}%` }} />
                  {STAR_STEPS.map((m) => (
                    <StarShape
                      key={m}
                      className={`meter-star ${score >= targetScore * m ? 'is-on' : ''}`}
                      style={{ left: `${(m / STAR_STEPS[STAR_STEPS.length - 1]) * 100}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className={`moves ${moves <= 5 ? 'is-low' : ''}`}>
                <span className="moves-num">{moves}</span>
                <span className="moves-label">Moves</span>
              </div>
            </div>
          </header>

          <div className="board-wrap">
            <div key={shake} className={`board ${shake ? 'is-shaking' : ''}`} aria-label="Game board">
              {board.map((tileImage, index) => {
                const row = Math.floor(index / BOARD_SIZE);
                const col = index % BOARD_SIZE;
                const anim = fx.dropped.has(index)
                  ? 'is-drop'
                  : fx.fell.has(index)
                    ? 'is-fall'
                    : fx.swapped.has(index)
                      ? 'is-swap'
                      : '';
                const poppedImg = !tileImage ? fx.cleared[index] : null;

                return (
                  <div
                    key={index}
                    className={`cell ${(row + col) % 2 ? 'is-alt' : ''} ${!tileImage ? 'is-empty' : ''} ${isPaused ? 'is-paused' : ''}`}
                    style={{ pointerEvents: isPaused ? 'none' : undefined }}
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
                  >
                    {tileImage && (
                      <span
                        key={anim ? `a${fx.gen}` : 'still'}
                        className={`piece ${anim}`}
                        style={{
                          backgroundImage: `url(${tileImage})`,
                          animationDelay: anim === 'is-drop' ? `${(BOARD_SIZE - 1 - row) * 18}ms` : undefined,
                        }}
                      />
                    )}
                    {poppedImg && (
                      <span key={`p${fx.gen}`}>
                        <span className="pop" style={{ backgroundImage: `url(${poppedImg})` }} />
                        {SPARKS.map((a) => <i key={a} className="spark" style={{ '--a': `${a + col * 13}deg` }} />)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="fx-layer" aria-hidden="true">
              {callout?.big && <div key={`f${callout.id}`} className="flash" />}
              {floats.map((f) => (
                <OText key={f.id} className="float-score" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
                  {f.text}
                </OText>
              ))}
              {callout && (
                <OText key={callout.id} variant={callout.variant} className="callout">
                  {callout.text}
                </OText>
              )}
            </div>
          </div>

          {level === 1 && <p className="board-hint">Drag a nad onto a neighbour to swap. Five in a row fires a Comet Blast.</p>}
        </div>
      </main>

      {/* Level intro banner */}
      {showIntro && (
        <div className="intro" aria-hidden="true">
          <div className="panel intro-card">
            <Ribbon tone="violet">{`Level ${level}`}</Ribbon>
            <p className="intro-goal">Score <b>{targetScore}</b> points</p>
            <p className="intro-sub">You have {startMoves} moves</p>
          </div>
        </div>
      )}

      {/* Pause */}
      {showSettings && (
        <div className="overlay" onClick={resume}>
          <section
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Paused"
            onClick={(e) => e.stopPropagation()}
          >
            <Ribbon tone="violet">Paused</Ribbon>

            <dl className="stats" style={{ marginTop: 18 }}>
              <div className="stat">
                <dt>Level</dt>
                <dd>{level}</dd>
              </div>
              <div className="stat">
                <dt>Score</dt>
                <dd>{score}<small> / {targetScore}</small></dd>
              </div>
              <div className="stat">
                <dt>Moves</dt>
                <dd>{moves}</dd>
              </div>
            </dl>

            <div className="panel-actions">
              <button type="button" className="gbtn" onClick={resume} autoFocus>
                <span className="stroke">Resume</span>
              </button>
              <SubmitScore score={score} level={level} />
              <button type="button" className="link-btn" onClick={onGoHome}>
                Quit to home
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
