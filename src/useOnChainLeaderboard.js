/**
 * useOnChainLeaderboard — Reads ScoreSubmitted events from the on-chain
 * game contract to build a global leaderboard.
 *
 * Returns { entries, isLoading, error } where entries is an array of
 * { wallet, username, score, level, timestamp } sorted by score descending.
 *
 * Auto-refreshes every 30 seconds.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { GAME_CONTRACT_ADDRESS } from './constants';

// The ScoreSubmitted event signature from the contract ABI
const SCORE_SUBMITTED_EVENT = parseAbiItem(
  'event ScoreSubmitted(address indexed player, uint256 score, uint256 level)'
);


export function useOnChainLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const publicClient = usePublicClient();

  const fetchLeaderboard = useCallback(async () => {
    if (!publicClient) return;

    try {
      // Get the latest block number to compute the fromBlock
      const latestBlock = await publicClient.getBlockNumber();
      
      // Base RPCs limit getLogs to 10,000 blocks per request.
      // We scan the last ~4.5 days (200,000 blocks) in 10k chunks.
      const TOTAL_BLOCKS = 200000n;
      const CHUNK_SIZE = 10000n;
      const startBlock = latestBlock > TOTAL_BLOCKS ? latestBlock - TOTAL_BLOCKS : 0n;

      // Create chunks
      const chunks = [];
      for (let i = startBlock; i < latestBlock; i += CHUNK_SIZE) {
        chunks.push({
          fromBlock: i,
          toBlock: i + CHUNK_SIZE - 1n > latestBlock ? latestBlock : i + CHUNK_SIZE - 1n
        });
      }

      // Fetch all chunks concurrently, failing gracefully on individual chunk rate limits
      const results = await Promise.all(
        chunks.map(chunk =>
          publicClient.getLogs({
            address: GAME_CONTRACT_ADDRESS,
            event: SCORE_SUBMITTED_EVENT,
            fromBlock: chunk.fromBlock,
            toBlock: chunk.toBlock,
          }).catch(err => {
            console.warn('Log chunk fetch failed:', err);
            return [];
          })
        )
      );

      const logs = results.flat();

      // Build a map of player -> best score entry
      // Each log.args has: player, score, level
      const bestScores = new Map();

      for (const log of logs) {
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

      // Convert to sorted array (highest score first)
      const sorted = Array.from(bestScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      setEntries(sorted);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch on-chain leaderboard:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  // Initial fetch + 30s polling
  useEffect(() => {
    fetchLeaderboard();

    intervalRef.current = setInterval(fetchLeaderboard, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLeaderboard]);

  return { entries, isLoading, error };
}
