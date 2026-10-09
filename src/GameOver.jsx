import { useEffect } from 'react';
import SubmitScore from './SubmitScore';
import { sfx } from './sound';
import { CANDY_IMAGES } from './constants';
import { OText, Ribbon } from './ui';

/**
 * GameOver screen – shown when the player runs out of moves.
 *
 * Props:
 *   score       – the player's final score
 *   targetScore – the target they were aiming for
 *   level       – current level number
 *   onRetry     – callback to restart the level
 *   onGoHome    – callback to return to the home screen
 */
export default function GameOver({ score, targetScore, level, onRetry, onGoHome }) {
  const short = Math.max(0, targetScore - score);
  const close = short <= targetScore * 0.25;

  useEffect(() => { sfx.lose(); }, []);

  return (
    <main className="scene is-dim">
      <div className="overlay result" style={{ background: 'rgba(30, 10, 84, 0.35)' }}>
        <section className="panel" aria-labelledby="result-title">
          <h2 id="result-title" className="sr-only">Out of moves on level {level}</h2>
          <Ribbon tone="red">Out of moves!</Ribbon>

          <div className="sad-nad" style={{ backgroundImage: `url(${CANDY_IMAGES[level % CANDY_IMAGES.length]})` }} aria-hidden="true" />

          <OText variant="white" className="result-score">{`${score}/${targetScore}`}</OText>
          <p className="result-caption">
            {close ? 'So close! ' : ''}You needed <b>{short}</b> more {short === 1 ? 'point' : 'points'} on level {level}.
          </p>

          <div className="panel-actions">
            <button type="button" className="gbtn gbtn--xl" onClick={() => { sfx.tap(); onRetry(); }}>
              <span className="stroke">Try again</span>
            </button>
            <SubmitScore score={score} level={level} />
            <button type="button" className="link-btn" onClick={onGoHome}>
              Back to home
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
