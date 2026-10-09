import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toHex } from 'viem';
import { Link2, Check } from 'lucide-react';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from './constants';
import { BUILDER_CODE } from './wagmi-config';

/**
 * "Post score on Base" button, shared by the pause, level-complete and
 * game-over screens. Same contract call as before (submitScore with the
 * optional builder-code data suffix); only the presentation changed.
 * Renders nothing when no wallet is connected.
 */
export default function SubmitScore({ score, level }) {
  const { address, isConnected } = useAccount();

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!isConnected) return null;

  const handleSubmit = () => {
    if (!isConnected || !address) return;
    try {
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'submitScore',
        args: [BigInt(score), BigInt(level)],
        ...(BUILDER_CODE ? { dataSuffix: toHex(BUILDER_CODE) } : {}),
      });
    } catch (err) {
      console.error('Failed to submit score on-chain:', err);
    }
  };

  const isSubmitting = isPending || isWaiting;
  const stateClass = isSuccess ? 'is-done' : isSubmitting ? 'is-busy' : '';

  return (
    <>
      <button
        type="button"
        className={`gbtn gbtn--blue ${stateClass}`}
        onClick={handleSubmit}
        disabled={isSubmitting || isSuccess}
      >
        {isSuccess ? (
          <><Check size={24} strokeWidth={3.5} color="var(--green-3)" /><span className="stroke">Score posted</span></>
        ) : isSubmitting ? (
          <><span className="spinner" /><span className="stroke">{isPending ? 'Confirm in wallet' : 'Posting…'}</span></>
        ) : (
          <><Link2 size={24} strokeWidth={3} style={{ filter: 'drop-shadow(0 2px 0 var(--plum))' }} /><span className="stroke">Post score on Base</span></>
        )}
      </button>

      {isSuccess && txHash && (
        <p className="tx-note">
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View transaction on BaseScan ↗
          </a>
        </p>
      )}

      {writeError && !isSubmitting && (
        <p className="tx-note is-error" role="alert">
          The transaction didn't go through. Check your wallet and try again.
        </p>
      )}
    </>
  );
}
