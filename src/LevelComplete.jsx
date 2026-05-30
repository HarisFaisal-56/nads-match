import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from './constants';
import { Link } from 'lucide-react';

/**
 * LevelComplete screen – shown when the player beats the target score.
 *
 * Props:
 *   score       – the player's final score
 *   targetScore – the target they were aiming for
 *   level       – current level number
 *   onNextLevel – callback to advance to the next level
 *   onRetry     – callback to replay the same level
 */
export default function LevelComplete({ score, targetScore, level, onNextLevel, onRetry }) {
  const { address, isConnected } = useAccount();

  // ── On-chain score submission ──────────────────────────────────
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isWaiting,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmitScore = () => {
    if (!isConnected || !address) return;
    try {
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'submitScore',
        args: [BigInt(score), BigInt(level)],
      });
    } catch (err) {
      console.error('Failed to submit score on-chain:', err);
    }
  };

  // Derive button label & disabled state
  const isSubmitting = isPending || isWaiting;
  const buttonLabel = isSuccess
    ? 'Confirmed ✨'
    : isSubmitting
      ? 'Submitting…'
      : (
          <>
            <Link size={18} />
            Submit Score On-Chain
          </>
        );

  const baseScanUrl = txHash
    ? `https://basescan.org/tx/${txHash}`
    : null;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="stars">⭐⭐⭐</div>
        <h2 className="modal-title">Level Complete!</h2>
        <p className="modal-score-text">Score: {score} / Target: {targetScore}</p>

        <div className="modal-actions">
          {/* On-chain submit button (only if wallet is connected) */}
          {isConnected && (
            <button
              className={`btn-pill ${isSuccess ? 'btn-success' : 'btn-primary'}`}
              onClick={handleSubmitScore}
              disabled={isSubmitting || isSuccess}
              style={{
                opacity: isSubmitting ? 0.7 : 1,
                cursor: (isSubmitting || isSuccess) ? 'default' : 'pointer',
              }}
            >
              {isSubmitting && (
                <span className="spinner" />
              )}
              {buttonLabel}
            </button>
          )}

          {/* BaseScan link after confirmation */}
          {isSuccess && baseScanUrl && (
            <a
              href={baseScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#2196f3',
                textDecoration: 'none',
                marginTop: 4,
              }}
            >
              View on BaseScan ↗
            </a>
          )}

          {/* Write error feedback */}
          {writeError && (
            <p style={{ fontSize: '0.8rem', color: '#e53935', fontWeight: 600, marginTop: 4 }}>
              Transaction failed — please try again.
            </p>
          )}

          <button className="btn-pill btn-primary" onClick={onNextLevel}>
            Next Level &rarr;
          </button>
          <button className="btn-pill btn-outline" onClick={onRetry}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
