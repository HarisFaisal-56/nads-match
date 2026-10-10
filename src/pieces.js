/**
 * Piece identity for animation.
 *
 * useGameLogic stores the board as 64 image URLs, so a piece has no
 * identity of its own. To make pieces slide (instead of popping in place)
 * we follow each piece from one board to the next, using the same rules
 * the game applies:
 *   - swap:    two neighbouring cells trade contents
 *   - clear:   matched cells become null
 *   - gravity: per column, survivors keep their order and sink; new
 *              pieces fill from the top (applyGravityAndFill)
 * Anything we can't explain falls back to "new piece in this cell".
 */
import { BOARD_SIZE } from './constants';

const N = BOARD_SIZE;

export function initTrack(board) {
  return {
    board,
    ids: board.map((_, i) => i + 1),
    born: {},
    nextId: board.length + 1,
  };
}

/** Advance the tracker to `next`. Returns the new track plus pieces that died this step. */
export function advanceTrack(track, next) {
  const prev = track.board;
  const ids = [...track.ids];
  const born = {};
  let nextId = track.nextId;
  const died = [];

  const changed = [];
  for (let i = 0; i < next.length; i++) if (prev[i] !== next[i]) changed.push(i);

  const allCleared = changed.length > 0 && changed.every((i) => prev[i] && !next[i]);
  const isFill = changed.length > 0 && prev.some((v) => !v) && next.every(Boolean);
  const isSwap =
    changed.length === 2 &&
    prev[changed[0]] === next[changed[1]] &&
    prev[changed[1]] === next[changed[0]];
  // a reshuffle: full board before and after, same pieces, new places
  const isShuffle =
    !isSwap &&
    changed.length > 2 &&
    prev.every(Boolean) &&
    next.every(Boolean) &&
    sameMultiset(prev, next);

  if (allCleared) {
    changed.forEach((i) => {
      died.push({ id: ids[i], idx: i, img: prev[i] });
      ids[i] = null;
    });
  } else if (isSwap) {
    const [a, b] = changed;
    [ids[a], ids[b]] = [ids[b], ids[a]];
  } else if (isFill) {
    for (let col = 0; col < N; col++) {
      const survivors = [];
      for (let row = N - 1; row >= 0; row--) {
        const i = row * N + col;
        if (prev[i]) survivors.push({ id: ids[i], img: prev[i] });
      }
      const fresh = N - survivors.length;
      for (let row = N - 1; row >= 0; row--) {
        const i = row * N + col;
        const k = N - 1 - row;
        if (k < survivors.length && survivors[k].img === next[i]) {
          ids[i] = survivors[k].id;
        } else {
          ids[i] = nextId++;
          // start stacked above the board, in the same order they'll land
          born[ids[i]] = row - fresh;
        }
      }
    }
  } else if (isShuffle) {
    // each piece slides to a new cell that shows the same nad
    const pool = {};
    prev.forEach((img, i) => { (pool[img] = pool[img] || []).push(ids[i]); });
    next.forEach((img, i) => { ids[i] = pool[img].shift(); });
  } else {
    // unknown change (e.g. a fresh board): new pieces wherever it changed
    changed.forEach((i) => {
      if (prev[i] && !next[i]) died.push({ id: ids[i], idx: i, img: prev[i] });
      ids[i] = next[i] ? nextId++ : null;
      if (next[i]) born[ids[i]] = Math.floor(i / N) - N;
    });
  }

  // keep only the birth info for pieces still on the board
  const alive = new Set(ids.filter(Boolean));
  Object.entries(track.born).forEach(([id, from]) => {
    if (alive.has(Number(id)) && born[id] === undefined) born[id] = from;
  });

  return { track: { board: next, ids, born, nextId }, died };
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const count = new Map();
  a.forEach((v) => count.set(v, (count.get(v) || 0) + 1));
  for (const v of b) {
    const n = count.get(v);
    if (!n) return false;
    count.set(v, n - 1);
  }
  return true;
}

/** Does this board contain a line of 3? (UI-side copy for hints and swap feedback.) */
export function hasMatch(b) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 2; c++) {
      const i = r * N + c;
      if (b[i] && b[i] === b[i + 1] && b[i] === b[i + 2]) return true;
    }
  }
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N - 2; r++) {
      const i = r * N + c;
      if (b[i] && b[i] === b[i + N] && b[i] === b[i + 2 * N]) return true;
    }
  }
  return false;
}

export function areNeighbours(a, b) {
  const ra = Math.floor(a / N);
  const rb = Math.floor(b / N);
  return Math.abs(ra - rb) + Math.abs((a % N) - (b % N)) === 1;
}

export function swapMakesMatch(board, a, b) {
  const t = [...board];
  [t[a], t[b]] = [t[b], t[a]];
  return hasMatch(t);
}

/** First swap that makes a match, preferring longer lines; null if none. */
export function findHint(board) {
  let best = null;
  for (let i = 0; i < board.length; i++) {
    for (const d of [1, N]) {
      const j = i + d;
      if (j >= board.length || (d === 1 && i % N === N - 1)) continue;
      if (!board[i] || !board[j] || board[i] === board[j]) continue;
      if (swapMakesMatch(board, i, j)) {
        best = best || [i, j];
      }
    }
  }
  return best;
}
