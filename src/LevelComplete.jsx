import SubmitScore from './SubmitScore';
import { MAX_LEVEL } from './constants';
import { OText, StarShape, Ribbon, Confetti } from './ui';
import { starsFor } from './ui-utils';

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
  const stars = starsFor(score, targetScore);
  const isLast = level >= MAX_LEVEL;
  const over = score - targetScore;

  return (
    <main className="scene">
      <Confetti />
      <div className="overlay result" style={{ background: 'rgba(30, 10, 84, 0.35)' }}>
        <section className="panel" aria-labelledby="result-title">
          <div className="big-stars" role="img" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <StarShape key={i} className={`big-star ${i < stars ? 'is-on' : ''}`} style={{ '--i': i }} />
            ))}
          </div>

          <h2 id="result-title" className="sr-only">Level {level} complete</h2>
          <Ribbon className="result-ribbon">{`Level ${level} complete!`}</Ribbon>

          <OText className="result-score">{score}</OText>
          <p className="result-caption">
            {over > 0
              ? <>Target was {targetScore}. You smashed it by <b>{over}</b>.</>
              : <>You hit the {targetScore} target exactly.</>}
          </p>

          <div className="panel-actions">
            <button type="button" className="gbtn gbtn--xl" onClick={onNextLevel}>
              <span className="stroke">{isLast ? 'Play again' : 'Next level'}</span>
            </button>
            <SubmitScore score={score} level={level} />
            <button type="button" className="link-btn" onClick={onRetry}>
              Replay level {level}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
