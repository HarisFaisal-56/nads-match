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
  const [board, setBoard] = useState(() => createBoardWithoutMatches(config.tileCount));
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(config.moves);
  const [targetScore] = useState(config.targetScore);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedRef = useRef(null);
  const dragTargetRef = useRef(null);
  const endedRef = useRef(false);
  const scoreRef = useRef(0);

  useEffect(() => { scoreRef.current = score; }, [score]);

  const processCascade = useCallback((currentBoard) => {
    const { matched, points } = findAllMatches(currentBoard);
    if (matched.size === 0) {
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
  }, [config.tileCount]);

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
    board, score, moves, targetScore, isProcessing,
    handleDragStart, handleDragOver, handleDragEnter, handleDragEnd,
  };
};