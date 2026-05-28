/**
 * useDailyCheckIn — Tracks daily check-in state per wallet address.
 *
 * Uses localStorage keyed by wallet address. The structure is ready
 * to be wired to a smart-contract (just replace the localStorage
 * calls with contract read/write interactions).
 */
import { useState, useCallback, useEffect } from 'react';

const STORAGE_PREFIX = 'nads_checkin_';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getCheckInData(wallet) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + wallet);
    return raw ? JSON.parse(raw) : { lastCheckIn: null, streak: 0 };
  } catch {
    return { lastCheckIn: null, streak: 0 };
  }
}

function saveCheckInData(wallet, data) {
  try {
    localStorage.setItem(STORAGE_PREFIX + wallet, JSON.stringify(data));
  } catch {
    // silently ignore
  }
}

export function useDailyCheckIn(walletAddress) {
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Load state on mount or when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      setHasCheckedInToday(false);
      setStreak(0);
      return;
    }
    const data = getCheckInData(walletAddress);
    const today = getTodayKey();
    setHasCheckedInToday(data.lastCheckIn === today);
    setStreak(data.streak || 0);
  }, [walletAddress]);

  /**
   * Perform the daily check-in.
   * In production this would call a smart-contract function;
   * for now it writes to localStorage.
   */
  const checkIn = useCallback(async () => {
    if (!walletAddress || hasCheckedInToday) return;

    setIsCheckingIn(true);

    // Simulate a brief async delay (mirrors future tx confirmation)
    await new Promise((r) => setTimeout(r, 600));

    const data = getCheckInData(walletAddress);
    const today = getTodayKey();
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);

    const newStreak =
      data.lastCheckIn === yesterday ? (data.streak || 0) + 1 : 1;

    const updated = { lastCheckIn: today, streak: newStreak };
    saveCheckInData(walletAddress, updated);

    setHasCheckedInToday(true);
    setStreak(newStreak);
    setIsCheckingIn(false);
  }, [walletAddress, hasCheckedInToday]);

  return { hasCheckedInToday, streak, checkIn, isCheckingIn };
}
