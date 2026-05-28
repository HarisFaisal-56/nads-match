/**
 * useLeaderboard — In-memory leaderboard state management.
 *
 * Stores entries as { wallet, username, score, level, timestamp }.
 * Sorted descending by score. Persisted to localStorage so it
 * survives page reloads (can later be swapped to an on-chain or
 * server-backed store).
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'nads_smash_leaderboard';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function useLeaderboard() {
  const [entries, setEntries] = useState(loadFromStorage);

  /**
   * Submit a score. Adds a new entry, re-sorts, keeps top 50,
   * and persists to localStorage.
   */
  const submitScore = useCallback(({ wallet, username, score, level }) => {
    setEntries((prev) => {
      const next = [
        ...prev,
        {
          wallet: wallet || '0x0000',
          username: username || 'Anon',
          score,
          level,
          timestamp: Date.now(),
        },
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      saveToStorage(next);
      return next;
    });
  }, []);

  /**
   * Clear the entire leaderboard (dev utility).
   */
  const clearLeaderboard = useCallback(() => {
    setEntries([]);
    saveToStorage([]);
  }, []);

  return { entries, submitScore, clearLeaderboard };
}
