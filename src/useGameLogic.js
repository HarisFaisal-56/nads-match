import { useState, useEffect, useCallback, useRef } from 'react';
import { BOARD_SIZE, CANDY_IMAGES, getLevelConfig } from './constants';

const getRandomCandy = (tileCount = CANDY_IMAGES.length) =>
  CANDY_IMAGES[Math.floor(Math.random() * tileCount)];

const createBoardWithoutMatches = (tileCount = CANDY_IMAGES.length) => {
  const board = [];
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    let candy;
    do {
      candy = getRandomCandy(tileCount);
    } while (
      (i % BOARD_SIZE >= 2 && board[i - 1] === candy && board[i - 2] === candy) ||
      (i >= BOARD_SIZE * 2 && board[i - BOARD_SIZE] === candy && board[i - BOARD_SIZE * 2] === candy)
    );
    board.push(candy);
  }
  return board;
};

// ── dead-board protection ───────────────────────────────────────
// With many tile types the board can end up with no swap that makes a match.
// Swaps that don't match cost no move, so without this the level could never
// end. These helpers let us start every level, and continue after every
// cascade, on a board that has at least one valid move.

const hasAnyMatch = (b) => {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const i = row * BOARD_SIZE + col;
      if (b[i] && b[i] === b[i + 1] && b[i] === b[i + 2]) return true;
    }
  }
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      const i = row * BOARD_SIZE + col;
      if (b[i] && b[i] === b[i + BOARD_SIZE] && b[i] === b[i + BOARD_SIZE * 2]) return true;
    }
  }
  return false;
};

export const hasValidMove = (b) => {
  for (let i = 0; i < b.length; i++) {
    const right = i % BOARD_SIZE < BOARD_SIZE - 1 ? i + 1 : -1;
    const down = i + BOARD_SIZE < b.length ? i + BOARD_SIZE : -1;
    for (const j of [right, down]) {
      if (j < 0 || !b[i] || !b[j] || b[i] === b[j]) continue;
      const t = [...b];
      [t[i], t[j]] = [t[j], t[i]];
      if (hasAnyMatch(t)) return true;
    }
  }
  return false;
};

/** A fresh board with no ready-made matches and at least one valid move. */
const createPlayableBoard = (tileCount) => {
  let board = createBoardWithoutMatches(tileCount);
  for (let tries = 0; tries < 200 && !hasValidMove(board); tries++) {
    board = createBoardWithoutMatches(tileCount);
  }
  return board;
};

/**
 * Rearrange the same pieces so there's no ready-made match and at least one
 * valid move. Falls back to a fresh playable board in the (very rare) case no
 * such arrangement turns up quickly.
 */
const shuffleBoard = (b, tileCount) => {
  const pieces = [...b];
  for (let tries = 0; tries < 300; tries++) {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    if (!hasAnyMatch(pieces) && hasValidMove(pieces)) return [...pieces];
  }
  return createPlayableBoard(tileCount);
};

// how long "No moves" shows before the shuffle, and how long the pieces take to settle
const SHUFFLE_NOTICE_MS = 700;
const SHUFFLE_SETTLE_MS = 650;

const findAllMatches = (b) => {
  const matched = new Set();
  let points = 0;
  let comet = false;

  for (let row = 0; row < BOARD_SIZE; row++) {
    let col = 0;
    while (col < BOARD_SIZE) {
      const idx = row * BOARD_SIZE + col;
      const candy = b[idx];
      if (!candy) { col++; continue; }
      let len = 1;
      while (col + len < BOARD_SIZE && b[row * BOARD_SIZE + col + len] === candy) len++;
      if (len >= 3) {
        for (let k = 0; k < len; k++) matched.add(row * BOARD_SIZE + col + k);
        if (len >= 5) { comet = true; points += 50; }
        else if (len === 4) { points += 20; }
        else { points += 10; }
      }
      col += Math.max(len, 1);
    }
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    let row = 0;
    while (row < BOARD_SIZE) {
      const idx = row * BOARD_SIZE + col;
      const candy = b[idx];
      if (!candy) { row++; continue; }
      let len = 1;
      while (row + len < BOARD_SIZE && b[(row + len) * BOARD_SIZE + col] === candy) len++;
      if (len >= 3) {
        for (let k = 0; k < len; k++) matched.add((row + k) * BOARD_SIZE + col);
        if (len >= 5) { comet = true; points += 50; }
        else if (len === 4) { points += 20; }
        else { points += 10; }
      }
      row += Math.max(len, 1);
    }
  }

  if (comet && matched.size > 0) {
    const available = [];
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
      if (b[i] && !matched.has(i)) available.push(i);
    }
    // Select up to 8 unique unmatched tiles
    for (let i = 0; i < 8 && available.length > 0; i++) {
      const randIdx = Math.floor(Math.random() * available.length);
      matched.add(available[randIdx]);
      available.splice(randIdx, 1); // remove so we don't pick it again
    }
  }

  return { matched, points };
};

const applyGravityAndFill = (b, tileCount) => {
  const next = [...b];
  for (let col = 0; col < BOARD_SIZE; col++) {
    const existing = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      const v = next[row * BOARD_SIZE + col];
      if (v !== null) existing.push(v);
    }
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      const pIdx = BOARD_SIZE - 1 - row;
      next[row * BOARD_SIZE + col] = pIdx < existing.length ? existing[pIdx] : getRandomCandy(tileCount);
    }
  }
  return next;
};

export const useGameLogic = (level, onLevelComplete, onGameOver) => {
  const config = getLevelConfig(level);
  const [board, setBoard] = useState(() => createPlayableBoard(config.tileCount));
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(config.moves);
  const [targetScore] = useState(config.targetScore);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const selectedRef = useRef(null);
  const dragTargetRef = useRef(null);
  const endedRef = useRef(false);
  const scoreRef = useRef(0);
  const movesRef = useRef(config.moves);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { movesRef.current = moves; }, [moves]);

  const processCascade = useCallback((currentBoard) => {
    const { matched, points } = findAllMatches(currentBoard);
    if (matched.size === 0) {
      const levelDecided =
        endedRef.current ||
        movesRef.current <= 0 ||
        (config.targetScore > 0 && scoreRef.current >= config.targetScore);
      if (!levelDecided && !hasValidMove(currentBoard)) {
        // stuck: say so, shuffle the same pieces, then hand control back.
        // Costs no move and gives no points; input stays blocked throughout.
        setIsShuffling(true);
        setTimeout(() => {
          setBoard(shuffleBoard(currentBoard, config.tileCount));
          setTimeout(() => {
            setIsShuffling(false);
            setIsProcessing(false);
          }, SHUFFLE_SETTLE_MS);
        }, SHUFFLE_NOTICE_MS);
        return;
      }
      setIsProcessing(false);
      return;
    }
    const cleared = [...currentBoard];
    matched.forEach(idx => { cleared[idx] = null; });
    setScore(s => s + points);
    setBoard([...cleared]);

    setTimeout(() => {
      const filled = applyGravityAndFill(cleared, config.tileCount);
      setBoard([...filled]);
      setTimeout(() => processCascade(filled), 280);
    }, 320);
  }, [config.tileCount, config.targetScore]);

  useEffect(() => {
    if (isProcessing || endedRef.current) return;
    if (score >= targetScore && targetScore > 0) {
      endedRef.current = true;
      setTimeout(() => onLevelComplete(score, targetScore), 500);
    } else if (moves <= 0 && score < targetScore) {
      endedRef.current = true;
      setTimeout(() => onGameOver(score, targetScore), 500);
    }
  }, [score, moves, isProcessing, targetScore, onLevelComplete, onGameOver]);

  const handleDragStart = useCallback((e, index) => {
    if (isProcessing || moves <= 0 || endedRef.current) return;
    selectedRef.current = index;
  }, [isProcessing, moves]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e, index) => {
    e.preventDefault();
    dragTargetRef.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (isProcessing || endedRef.current) return;
    const from = selectedRef.current;
    const to = dragTargetRef.current;
    selectedRef.current = null;
    dragTargetRef.current = null;

    if (from === null || to === null || from === to) return;
    if (moves <= 0) return;

    const fromRow = Math.floor(from / BOARD_SIZE);
    const fromCol = from % BOARD_SIZE;
    const toRow = Math.floor(to / BOARD_SIZE);
    const toCol = to % BOARD_SIZE;
    if (Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) !== 1) return;

    const newBoard = [...board];
    [newBoard[from], newBoard[to]] = [newBoard[to], newBoard[from]];

    const { matched } = findAllMatches(newBoard);
    if (matched.size > 0) {
      setBoard([...newBoard]);
      setMoves(m => m - 1);
      setIsProcessing(true);
      setTimeout(() => processCascade(newBoard), 200);
    } else {
      // Invalid swap: visually show the swap, then revert back to original
      setBoard([...newBoard]);
      setIsProcessing(true);
      setTimeout(() => {
        setBoard([...board]);
        setIsProcessing(false);
      }, 300);
    }
  }, [board, isProcessing, moves, processCascade]);

  return {
    board, score, moves, targetScore, isProcessing, isShuffling,
    handleDragStart, handleDragOver, handleDragEnter, handleDragEnd,
  };
};