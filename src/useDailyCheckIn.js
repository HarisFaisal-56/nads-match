import { useState, useCallback, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from './constants';

export function useDailyCheckIn(walletAddress) {
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [timeUntilNextCheckIn, setTimeUntilNextCheckIn] = useState(null);
  const [isCooldownActive, setIsCooldownActive] = useState(false);

  const { data: lastCheckInBN, refetch: refetchLastCheckIn } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'lastCheckIn',
    args: walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: !!walletAddress,
    },
  });

  const { data: streakBN, refetch: refetchStreak } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'streak',
    args: walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: !!walletAddress,
    },
  });

  useEffect(() => {
    if (!walletAddress) {
      setHasCheckedInToday(false);
      setStreak(0);
      return;
    }

    if (lastCheckInBN !== undefined) {
      const lastTs = Number(lastCheckInBN) * 1000;
      if (lastTs === 0) {
        setHasCheckedInToday(false);
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const lastCheckInDay = new Date(lastTs).toISOString().slice(0, 10);
        setHasCheckedInToday(today === lastCheckInDay);
      }
    }

    if (streakBN !== undefined) {
      setStreak(Number(streakBN));
    }
  }, [walletAddress, lastCheckInBN, streakBN]);

  useEffect(() => {
    if (!lastCheckInBN) {
      setIsCooldownActive(false);
      setTimeUntilNextCheckIn(null);
      return;
    }

    const lastTs = Number(lastCheckInBN);
    if (lastTs === 0) {
      setIsCooldownActive(false);
      setTimeUntilNextCheckIn(null);
      return;
    }

    const targetTime = lastTs + 86400;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = targetTime - now;

      if (remaining > 0) {
        setIsCooldownActive(true);
        const h = Math.floor(remaining / 3600).toString().padStart(2, '0');
        const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        setTimeUntilNextCheckIn(`${h}:${m}:${s}`);
      } else {
        setIsCooldownActive(false);
        setTimeUntilNextCheckIn(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastCheckInBN]);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isWaiting, isSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isCheckingIn = isPending || isWaiting;

  useEffect(() => {
    if (isSuccess) {
      // Immediately refetch
      refetchLastCheckIn();
      refetchStreak();
      
      // Delay to handle RPC sync/propagation issues and refetch again
      const timer = setTimeout(() => {
        refetchLastCheckIn();
        refetchStreak();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isSuccess, refetchLastCheckIn, refetchStreak]);

  useEffect(() => {
    if (writeError) {
      console.error('Error initiating check-in transaction:', writeError);
    }
    if (isReceiptError) {
      console.error('Check-in transaction failed on-chain.');
    }
  }, [writeError, isReceiptError]);

  const checkIn = useCallback(() => {
    if (!walletAddress || hasCheckedInToday || isCheckingIn || isCooldownActive) return;
    try {
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'checkIn',
      });
    } catch (err) {
      console.error('Failed to call checkIn:', err);
    }
  }, [walletAddress, hasCheckedInToday, isCheckingIn, isCooldownActive, writeContract]);

  return { hasCheckedInToday, streak, checkIn, isCheckingIn, timeUntilNextCheckIn, isCooldownActive };
}
