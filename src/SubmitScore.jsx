import { useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { base } from 'wagmi/chains';
import { toHex } from 'viem';
import { Link2, Check } from 'lucide-react';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from './constants';
import { BUILDER_CODE } from './wagmi-config';
import { useScoreTx } from './useScoreTx';
import { useEnsureBase } from './useEnsureBase';

/**
 * "Post score on Base" button, shared by the pause, level-complete and
 * game-over screens. Same contract call as before (submitScore with the
 * optional builder-code data suffix); only the presentation changed.
 * Renders nothing when no wallet is connected.
 */
export default function SubmitScore({ score, level, tx }) {
  const { address, isConnected, chainId } = useAccount();
  const own = useScoreTx();
  const { write, receipt } = tx ?? own;
  const ensureBase = useEnsureBase();
  const [isSwitching, setIsSwitching] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const busy = useRef(false);

  const { writeContract, data: txHash, isPending, error: writeError, variables } = write;
  const { isLoading: isWaiting, isSuccess } = receipt;

  if (!isConnected) return null;

  // a posted score only counts as "done" for the score/level it was sent with
  const sentArgs = variables?.args;
  const sameScore = !!sentArgs && sentArgs[0] === BigInt(score) && sentArgs[1] === BigInt(level);
  const isSubmitting = isPending || isWaiting || isSwitching;
  const isDone = isSuccess && sameScore;

  const handleSubmit = async () => {
    if (!isConnected || !address || isSubmitting || busy.current) return;
    busy.current = true;
    setWrongNetwork(false);
    const needsSwitch = chainId !== base.id;
    if (needsSwitch) setIsSwitching(true);
    const onBase = await ensureBase();
    if (needsSwitch) setIsSwitching(false);
    if (!onBase) {
      setWrongNetwork(true);
      busy.current = false;
      return;
    }
    try {
      writeContract({
        chainId: base.id,
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'submitScore',
        args: [BigInt(score), BigInt(level)],
        ...(BUILDER_CODE ? { dataSuffix: toHex(BUILDER_CODE) } : {}),
      });
    } catch (err) {
      console.error('Failed to submit score on-chain:', err);
    } finally {
      busy.current = false;
    }
  };

  const stateClass = isDone ? 'is-done' : isSubmitting ? 'is-busy' : '';

  return (
    <>
      <button
        type="button"
        className={`gbtn gbtn--blue ${stateClass}`}
        onClick={handleSubmit}
        disabled={isSubmitting || isDone}
      >
        {isDone ? (
          <><Check size={24} strokeWidth={3.5} color="var(--green-3)" /><span className="stroke">Score posted</span></>
        ) : isSubmitting ? (
          <><span className="spinner" /><span className="stroke">{isSwitching ? 'Switch to Base' : isPending ? 'Confirm in wallet' : 'Posting…'}</span></>
        ) : (
          <><Link2 size={24} strokeWidth={3} style={{ filter: 'drop-shadow(0 2px 0 var(--plum))' }} /><span className="stroke">{isSuccess ? 'Post new score' : 'Post score on Base'}</span></>
        )}
      </button>

      {isDone && txHash && (
        <p className="tx-note">
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View transaction on BaseScan ↗
          </a>
        </p>
      )}

      {wrongNetwork && chainId !== base.id && !isSubmitting && (
        <p className="tx-note is-error" role="alert">
          Switch your wallet to the Base network to post your score.
        </p>
      )}

      {writeError && !isSubmitting && !(wrongNetwork && chainId !== base.id) && (
        <p className="tx-note is-error" role="alert">
          The transaction didn't go through. Check your wallet and try again.
        </p>
      )}
    </>
  );
}
