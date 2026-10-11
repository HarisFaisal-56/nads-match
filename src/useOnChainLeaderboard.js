/**
 * useOnChainLeaderboard — Reads ScoreSubmitted events from the on-chain
 * game contract to build a global leaderboard.
 *
 * Returns { entries, isLoading, error, refetch } where entries is an array of
 * { wallet, username, score, level, timestamp } sorted by score descending.
 *
 * How it stays light on the free public Base servers:
 *  - The first load scans the last ~4.6 days in 10k-block chunks, a few at a
 *    time, moving on to other public Base servers when one refuses, retrying,
 *    and splitting a chunk if a server says the range is too big.
 *  - After that, each refresh only asks for the blocks since the last one
 *    (usually a single request), and nothing is fetched while the tab is hidden.
 *  - Chunks that still fail are remembered and tried again on the next refresh,
 *    instead of being treated as "no scores".
 *  - A score the player just posted shows up as soon as its transaction
 *    confirms (see announceScoreReceipt), without waiting for the next poll.
 *
 * Auto-refreshes every 30 seconds.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, decodeEventLog, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { GAME_CONTRACT_ADDRESS } from './constants';

// The ScoreSubmitted event signature from the contract ABI
const SCORE_SUBMITTED_EVENT = parseAbiItem(
  'event ScoreSubmitted(address indexed player, uint256 score, uint256 level)'
);

const WINDOW_BLOCKS = 200000n;   // ~4.6 days of Base blocks (2s each)
const CHUNK_SIZE = 10000n;       // most Base RPCs cap getLogs at 10k blocks
const MIN_SPLIT = 1250n;         // smallest range we split down to
const CONCURRENCY = 3;           // requests in flight at once
const RETRY_DELAYS = [600, 1800];
const POLL_MS = 30000;
const OVERLAP = 30n;             // re-check the last ~minute in case a server lagged

// Read-only clients for the leaderboard. The official public endpoint goes
// first; if a server refuses or times out, the same request moves on to the
// next public Base server. VITE_BASE_RPC_URL (optional) lets a dedicated RPC
// key go first. Whichever server answered last is tried first next time.
const RPC_URLS = [
  import.meta.env.VITE_BASE_RPC_URL,
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
  'https://base.drpc.org',
  'https://base.llamarpc.com',
].filter(Boolean);

const clients = RPC_URLS.map((url) =>
  createPublicClient({ chain: base, transport: http(url, { retryCount: 0, timeout: 12000 }) })
);
let preferred = 0;

async function withAnyClient(fn) {
  const errors = [];
  for (let k = 0; k < clients.length; k++) {
    const i = (preferred + k) % clients.length;
    try {
      const out = await fn(clients[i]);
      preferred = i;
      return out;
    } catch (err) {
      errors.push(err);
    }
  }
  const err = new Error('No Base RPC answered');
  err.errors = errors;
  throw err;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logKey = (log) => `${log.transactionHash}:${log.logIndex}`;

// Errors that mean "ask for a smaller block range", not "try again later".
const isRangeError = (err) => (err?.errors || [err]).some((e) => {
  if (e?.status === 429) return false; // HTTP "Too Many Requests" is a rate limit
  const msg = String(e?.details || e?.shortMessage || e?.message || '').toLowerCase();
  return !msg.includes('rate') && /range|too many (blocks|logs|results)|too large|exceed|limit|max(imum)? block|results/.test(msg);
});

function getLogsRange(fromBlock, toBlock) {
  return withAnyClient((client) => client.getLogs({
    address: GAME_CONTRACT_ADDRESS,
    event: SCORE_SUBMITTED_EVENT,
    fromBlock,
    toBlock,
  }));
}

// Fetch one range with retries; split it in half if the server says it's too big.
// Resolves to { logs, failed: [ranges that still failed] }.
async function fetchRange(range) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return { logs: await getLogsRange(range.fromBlock, range.toBlock), failed: [] };
    } catch (err) {
      lastErr = err;
      if (isRangeError(err)) break;
      if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
    }
  }
  const size = range.toBlock - range.fromBlock + 1n;
  if (isRangeError(lastErr) && size > MIN_SPLIT) {
    const mid = range.fromBlock + size / 2n - 1n;
    const a = await fetchRange({ fromBlock: range.fromBlock, toBlock: mid });
    const b = await fetchRange({ fromBlock: mid + 1n, toBlock: range.toBlock });
    return { logs: [...a.logs, ...b.logs], failed: [...a.failed, ...b.failed] };
  }
  console.warn('Leaderboard: could not load blocks', range.fromBlock, '-', range.toBlock, lastErr);
  return { logs: [], failed: [range] };
}

// Run fetchRange over many ranges, CONCURRENCY at a time.
async function fetchRanges(ranges) {
  const logs = [];
  const failed = [];
  let next = 0;
  const worker = async () => {
    while (next < ranges.length) {
      const r = ranges[next++];
      const res = await fetchRange(r);
      logs.push(...res.logs);
      failed.push(...res.failed);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ranges.length) }, worker));
  return { logs, failed };
}

function splitIntoChunks(fromBlock, toBlock) {
  const chunks = [];
  for (let i = fromBlock; i <= toBlock; i += CHUNK_SIZE) {
    const end = i + CHUNK_SIZE - 1n;
    chunks.push({ fromBlock: i, toBlock: end > toBlock ? toBlock : end });
  }
  return chunks;
}

// ── Instant updates after the player posts a score ──────────────
const listeners = new Set();

/**
 * Call with a confirmed submitScore receipt. Any ScoreSubmitted event in it is
 * added to the leaderboard right away (deduped against what the poll finds).
 */
export function announceScoreReceipt(receipt) {
  if (!receipt?.logs) return;
  const found = [];
  for (const log of receipt.logs) {
    if (log.address?.toLowerCase() !== GAME_CONTRACT_ADDRESS.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: [SCORE_SUBMITTED_EVENT], data: log.data, topics: log.topics });
      if (decoded.eventName === 'ScoreSubmitted') found.push({ ...log, args: decoded.args });
    } catch {
      // not a ScoreSubmitted log
    }
  }
  if (found.length) listeners.forEach((fn) => fn(found));
}

function buildEntries(logMap) {
  // Build a map of player -> best score entry
  const bestScores = new Map();
  for (const log of logMap.values()) {
    const { player, score, level } = log.args;
    const scoreNum = Number(score);
    const levelNum = Number(level);
    const addr = player.toLowerCase();

    const existing = bestScores.get(addr);
    if (!existing || scoreNum > existing.score) {
      bestScores.set(addr, {
        wallet: player,
        username: `${player.slice(0, 6)}…${player.slice(-4)}`,
        score: scoreNum,
        level: levelNum,
        timestamp: Date.now(),
      });
    }
  }
  // Highest score first
  return Array.from(bestScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

export function useOnChainLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const logsRef = useRef(new Map());   // key -> log, everything seen so far
  const scannedToRef = useRef(null);   // highest block covered (bigint)
  const missingRef = useRef([]);       // ranges that failed, retried next time
  const inFlightRef = useRef(null);    // shared promise so calls never overlap

  const publish = useCallback(() => {
    setEntries(buildEntries(logsRef.current));
  }, []);

  const runFetch = useCallback(async () => {
    try {
      const latestBlock = await withAnyClient((client) => client.getBlockNumber({ cacheTime: 0 }));
      const windowStart = latestBlock > WINDOW_BLOCKS ? latestBlock - WINDOW_BLOCKS : 0n;

      // What to ask for: retries of failed ranges + blocks we haven't covered yet.
      const from = scannedToRef.current === null ? windowStart : scannedToRef.current + 1n - OVERLAP;
      const ranges = missingRef.current.filter((r) => r.toBlock >= windowStart);
      if (from <= latestBlock) ranges.push(...splitIntoChunks(from > windowStart ? from : windowStart, latestBlock));

      const { logs, failed } = await fetchRanges(ranges);

      for (const log of logs) logsRef.current.set(logKey(log), log);
      // Drop scores that have slid out of the window.
      for (const [k, log] of logsRef.current) {
        if (log.blockNumber != null && BigInt(log.blockNumber) < windowStart) logsRef.current.delete(k);
      }
      scannedToRef.current = latestBlock;
      missingRef.current = failed;
      publish();

      // Only report an error when we have nothing to show at all;
      // a partly loaded board is still useful and the gaps retry next poll.
      setError(failed.length > 0 && logsRef.current.size === 0
        ? new Error('Could not load scores from Base')
        : null);
    } catch (err) {
      console.error('Failed to fetch on-chain leaderboard:', err);
      if (logsRef.current.size === 0) setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [publish]);

  const fetchLeaderboard = useCallback(() => {
    if (!inFlightRef.current) {
      inFlightRef.current = runFetch().finally(() => { inFlightRef.current = null; });
    }
    return inFlightRef.current;
  }, [runFetch]);

  const refetch = useCallback(() => {
    if (logsRef.current.size === 0) setIsLoading(true);
    setError(null);
    return fetchLeaderboard();
  }, [fetchLeaderboard]);

  // A score the player just posted: show it now, then refresh from chain.
  useEffect(() => {
    const onScore = (logs) => {
      for (const log of logs) logsRef.current.set(logKey(log), log);
      setError(null);
      publish();
      fetchLeaderboard();
    };
    listeners.add(onScore);
    return () => { listeners.delete(onScore); };
  }, [publish, fetchLeaderboard]);

  // Initial fetch + 30s polling (skipped while the tab is in the background)
  useEffect(() => {
    fetchLeaderboard();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchLeaderboard();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  return { entries, isLoading, error, refetch };
}
