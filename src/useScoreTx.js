import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { base } from 'wagmi/chains';

/**
 * The on-chain "submit score" transaction state. Kept as its own hook so a
 * parent that mounts and unmounts the button (the pause menu) can hold the
 * state, and the player sees "Score posted" again after resuming instead of
 * re-sending.
 */
export function useScoreTx() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: base.id });
  return { write, receipt };
}
