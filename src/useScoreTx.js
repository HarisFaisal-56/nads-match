import { useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { base } from 'wagmi/chains';
import { announceScoreReceipt } from './useOnChainLeaderboard';

/**
 * The on-chain "submit score" transaction state. Kept as its own hook so a
 * parent that mounts and unmounts the button (the pause menu) can hold the
 * state, and the player sees "Score posted" again after resuming instead of
 * re-sending.
 *
 * Once the transaction confirms, its ScoreSubmitted event is handed to the
 * leaderboard so the new score shows up straight away.
 */
export function useScoreTx() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: base.id });

  const confirmed = receipt.isSuccess ? receipt.data : null;
  useEffect(() => {
    if (confirmed?.status === 'success') announceScoreReceipt(confirmed);
  }, [confirmed]);

  return { write, receipt };
}
