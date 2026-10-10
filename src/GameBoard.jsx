import { useState, useEffect, useRef } from 'react';
import { Pause } from 'lucide-react';
import { useGameLogic } from './useGameLogic';
import { BOARD_SIZE, CANDY_IMAGES } from './constants';
import SubmitScore from './SubmitScore';
import { useScoreTx } from './useScoreTx';
import { OText, StarShape, Ribbon, MuteButton } from './ui';
import { STAR_STEPS, COMBO_WORDS } from './ui-utils';
import { initTrack, advanceTrack, areNeighbours, swapMakesMatch, findHint } from './pieces';
import { sfx, buzz, unlockAudio } from './sound';

const N = BOARD_SIZE;
const SPARKS = [0, 60, 120, 180, 240, 300];
const HINT_AFTER_MS = 5000;

// one frame colour per character, so matches read at a glance
const RINGS = ['#FF5C6C', '#FFB224', '#FFE14D', '#6EE04A', '#2FD9C9', '#3F8CFF', '#A06BFF', '#FF6FCF', '#FFFFFF'];
const ringFor = (img) => RINGS[Math.max(0, CANDY_IMAGES.indexOf(img)) % RINGS.length];

const SHAKE = [
  { transform: 'translate(0,0) rotate(0)' },
  { transform: 'translate(-8px,3px) rotate(-1deg)' },
  { transform: 'translate(7px,-4px) rotate(1deg)' },
  { transform: 'translate(-5px,2px) rotate(-0.5deg)' },
  { transform: 'translate(3px,-1px) rotate(0.3deg)' },
  { transform: 'translate(0,0) rotate(0)' },
];

const fakeEvent = { preventDefault() {} };

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

function centroid(indices) {
  if (!indices.length) return { x: 50, y: 50 };
  let r = 0;
  let c = 0;
  indices.forEach((i) => { r += Math.floor(i / N); c += i % N; });
  return { x: ((c / indices.length + 0.5) / N) * 100, y: ((r / indices.length + 0.5) / N) * 100 };
}

export default function GameBoard({ level, username, onWin, onLose, onGoHome }) {
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const {
    board, score, moves, targetScore, isProcessing, isShuffling,
    handleDragStart, handleDragEnter, handleDragEnd
  } = useGameLogic(level, onWin, onLose);

  // lives here (not in the pause menu) so a pending/posted tx survives pause → resume
  const scoreTx = useScoreTx();

  // ── piece tracking + effects, derived from how board/score/moves change ──
  const [startMoves] = useState(moves);
  const [showIntro, setShowIntro] = useState(true);
  const [prev, setPrev] = useState({ board, score, moves });
  const [track, setTrack] = useState(() => initTrack(board));
  const [pops, setPops] = useState([]);
  const [combo, setCombo] = useState(0);
  const [floats, setFloats] = useState([]);
  const [callout, setCallout] = useState(null);
  const [event, setEvent] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const [inputTick, setInputTick] = useState(0);
  const [shuffleSeen, setShuffleSeen] = useState(false);

  if (isShuffling !== shuffleSeen) {
    setShuffleSeen(isShuffling);
    if (isShuffling) {
      const id = `shuffle-${track.nextId}-${moves}`;
      setCallout({ id, text: 'No moves!', variant: 'pink', big: true });
      setEvent({ id, kind: 'stuck' });
      if (selected !== null) setSelected(null);
      if (hint) setHint(null);
    }
  }

  if (prev.board !== board || prev.score !== score || prev.moves !== moves) {
    let died = [];
    if (prev.board !== board) {
      const res = advanceTrack(track, board);
      died = res.died;
      setTrack(res.track);
      if (died.length) {
        const stamp = `${res.track.nextId}-${died[0].id}`;
        setPops((p) => [...p.slice(-40), ...died.map((d) => ({ ...d, key: `${stamp}-${d.id}` }))]);
      }
      if (hint) setHint(null);
      if (isShuffling) setEvent({ id: `shuffled-${res.track.nextId}-${moves}`, kind: 'shuffled' });
    }

    let nextCombo = moves !== prev.moves ? 0 : combo;
    const gained = score - prev.score;
    if (gained > 0) {
      nextCombo += 1;
      const at = centroid(died.map((d) => d.idx));
      const id = `${score}-${moves}-${nextCombo}`;
      setFloats((f) => [...f, { id, ...at, text: `+${gained}` }]);
      if (gained >= 50) {
        setCallout({ id, text: 'Comet Blast!', variant: 'pink', big: true });
        setEvent({ id, kind: 'comet', combo: nextCombo });
      } else {
        // never cut the Comet Blast banner short with a combo word
        if (nextCombo >= 2 && !callout?.big) {
          setCallout({ id, text: COMBO_WORDS[Math.min(nextCombo, COMBO_WORDS.length - 1)], variant: '' });
        }
        setEvent({ id, kind: 'match', combo: nextCombo });
      }
    }
    if (nextCombo !== combo) setCombo(nextCombo);
    setPrev({ board, score, moves });
  }

  // ── side effects: sound, vibration, screen shake, timers ──
  const boardRef = useRef(null);

  useEffect(() => {
    if (!event) return;
    if (event.kind === 'stuck') {
      sfx.bonk();
      buzz(20);
    } else if (event.kind === 'shuffled') {
      sfx.swap();
    } else if (event.kind === 'comet') {
      sfx.comet();
      buzz([30, 40, 70]);
      boardRef.current?.animate?.(SHAKE, { duration: 480, easing: 'ease-out' });
    } else {
      sfx.match(event.combo);
      buzz(event.combo > 1 ? [12, 30, 12] : 12);
    }
  }, [event]);

  useEffect(() => {
    if (!pops.length) return undefined;
    const t = setTimeout(() => setPops([]), 600);
    return () => clearTimeout(t);
  }, [pops]);

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

  // wiggle a valid move if the player has been idle for a while
  useEffect(() => {
    if (isProcessing || isPaused || showIntro || moves <= 0) return undefined;
    const t = setTimeout(() => setHint(findHint(board)), HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, [board, isProcessing, isPaused, showIntro, moves, inputTick]);

  // ── input: swipe a piece, or tap one then tap a neighbour ──
  const dragRef = useRef(null);
  // same end conditions useGameLogic uses, so the board locks the moment a level is decided
  const levelDecided = (targetScore > 0 && score >= targetScore) || moves <= 0;
  const blocked = isPaused || isProcessing || levelDecided;

  const cellAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest?.('[data-index]');
    return cell ? Number(cell.dataset.index) : null;
  };

  const trySwap = (a, b) => {
    if (blocked || !areNeighbours(a, b) || !board[a] || !board[b]) return;
    if (swapMakesMatch(board, a, b)) {
      sfx.swap();
    } else {
      sfx.bonk();
      buzz([8, 40, 8]);
    }
    handleDragStart(fakeEvent, a);
    handleDragEnter(fakeEvent, b);
    handleDragEnd();
  };

  const onPointerDown = (e) => {
    unlockAudio();
    setInputTick((n) => n + 1);
    if (hint) setHint(null);
    if (blocked) return;
    const idx = cellAt(e.clientX, e.clientY);
    if (idx === null || !board[idx]) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { idx, x: e.clientX, y: e.clientY, done: false };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.done) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const cellSize = (boardRef.current?.clientWidth || 320) / N;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cellSize * 0.32) return;
    const row = Math.floor(d.idx / N);
    const col = d.idx % N;
    let to = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && col < N - 1) to = d.idx + 1;
      if (dx < 0 && col > 0) to = d.idx - 1;
    } else {
      if (dy > 0 && row < N - 1) to = d.idx + N;
      if (dy < 0 && row > 0) to = d.idx - N;
    }
    d.done = true;
    setSelected(null);
    if (to !== null) trySwap(d.idx, to);
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.done || blocked) return;
    // a tap, not a swipe
    if (selected !== null && selected !== d.idx && areNeighbours(selected, d.idx)) {
      setSelected(null);
      trySwap(selected, d.idx);
    } else if (selected === d.idx) {
      setSelected(null);
    } else {
      setSelected(d.idx);
      sfx.select();
    }
  };

  const maxMeter = targetScore * STAR_STEPS[STAR_STEPS.length - 1];
  const meter = maxMeter > 0 ? Math.min(100, (score / maxMeter) * 100) : 0;

  const pause = () => { setIsPaused(true); setShowSettings(true); setSelected(null); };
  const resume = () => { setShowSettings(false); setIsPaused(false); };

  // pieces in id order keeps DOM order stable, so CSS transitions survive re-renders
  const pieces = [];
  track.ids.forEach((id, idx) => {
    if (id && board[idx]) pieces.push({ id, idx, img: board[idx] });
  });
  pieces.sort((a, b) => a.id - b.id);

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
              <span className="hud-spacer" />
              <MuteButton small />
            </div>

            <div className="hud-panel">
              <div className="hud-score">
                <div className="score-head">
                  <OText variant="white" className="level-flag">{`Level ${level}`}</OText>
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

          <div className="board-zone">
            <div className="board-wrap">
              <div
                ref={boardRef}
                className={`board ${isPaused ? 'is-paused' : ''} ${isProcessing ? 'is-busy' : ''} ${isShuffling ? 'is-shuffling' : ''}`}
                aria-label="Game board"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { dragRef.current = null; }}
              >
                <div className="cells">
                  {board.map((_, index) => (
                    <div
                      key={index}
                      className={`cell ${(Math.floor(index / N) + (index % N)) % 2 ? 'is-alt' : ''}`}
                      data-index={index}
                    />
                  ))}
                </div>

                <div className="pieces">
                  {pieces.map(({ id, idx, img }) => {
                    const from = track.born[id];
                    const isHint = hint && (hint[0] === idx || hint[1] === idx);
                    return (
                      <span
                        key={id}
                        className={`piece ${from !== undefined ? 'is-born' : ''} ${selected === idx ? 'is-selected' : ''} ${isHint ? 'is-hint' : ''}`}
                        style={{
                          '--r': Math.floor(idx / N),
                          '--c': idx % N,
                          '--from': from ?? 0,
                          '--ring': ringFor(img),
                        }}
                      >
                        <span className="piece-face" style={{ backgroundImage: `url(${img})` }} />
                      </span>
                    );
                  })}

                  {pops.map((p) => (
                    <span
                      key={p.key}
                      className="piece piece--pop"
                      style={{ '--r': Math.floor(p.idx / N), '--c': p.idx % N, '--ring': ringFor(p.img) }}
                    >
                      <span className="piece-face" style={{ backgroundImage: `url(${p.img})` }} />
                      {SPARKS.map((a) => <i key={a} className="spark" style={{ '--a': `${a + (p.idx % 7) * 13}deg` }} />)}
                    </span>
                  ))}
                </div>
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

            <p className="board-hint">
              {isShuffling
                ? 'No moves left, so the board is shuffling. It won\'t cost you a move.'
                : level === 1
                  ? 'Swipe a nad, or tap two neighbours to swap. Five in a row fires a Comet Blast.'
                  : 'Stuck? Wait a moment and a possible move will wiggle.'}
            </p>
          </div>
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
              <button type="button" className="gbtn" onClick={() => { sfx.tap(); resume(); }} autoFocus>
                <span className="stroke">Resume</span>
              </button>
              <SubmitScore score={score} level={level} tx={scoreTx} />
              <div className="pause-row">
                <MuteButton small />
                <button type="button" className="link-btn" onClick={onGoHome}>
                  Quit to home
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
