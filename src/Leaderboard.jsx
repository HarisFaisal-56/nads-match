import { X } from 'lucide-react';
import { Ribbon, Crown } from './ui';
import { identicon, shortAddr } from './ui-utils';

const PODIUM_ORDER = [1, 0, 2]; // second, first, third, left to right
const PODIUM_CLASS = ['is-first', 'is-second', 'is-third'];

export default function Leaderboard({ entries, onClose, onRetry, isLoading, error, me }) {
  const mine = me?.toLowerCase();
  const isMe = (e) => !!mine && e.wallet?.toLowerCase() === mine;
  const top = entries.slice(0, 10);
  const podium = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label="Leaderboard"
        onClick={(e) => e.stopPropagation()}
      >
        <Ribbon tone="blue">Leaderboard</Ribbon>
        <button type="button" className="rbtn rbtn--red rbtn--sm panel-close" onClick={onClose} aria-label="Close leaderboard">
          <X size={22} strokeWidth={4} />
        </button>
        <p className="panel-sub">Best posted score per wallet, last few days on Base</p>

        {isLoading && entries.length === 0 ? (
          <ol className="lb-list" aria-label="Loading scores">
            {Array.from({ length: 5 }).map((_, i) => <li key={i} className="lb-row skeleton" />)}
          </ol>
        ) : error ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            <h3>Couldn't reach Base</h3>
            <p>The scores didn't load. Give it another go.</p>
            <button type="button" className="gbtn gbtn--blue gbtn--sm" style={{ marginTop: 14 }} onClick={onRetry}>
              <span className="stroke">Try again</span>
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            <h3>No scores yet</h3>
            <p>Clear a level and post your score to grab the crown.</p>
          </div>
        ) : (
          <>
            <div className="podium" style={{ marginTop: 34 }}>
              {PODIUM_ORDER.map((rank) => {
                const e = podium[rank];
                if (!e) return <div key={rank} />;
                return (
                  <div key={rank} className={`podium-spot ${PODIUM_CLASS[rank]} ${isMe(e) ? 'is-you' : ''}`}>
                    <div className="podium-avatar" style={identicon(e.wallet)}>
                      {rank === 0 && <Crown />}
                    </div>
                    <div className="podium-addr">{isMe(e) ? 'You' : shortAddr(e.wallet) || e.username}</div>
                    <div className="podium-block">
                      <span className="rank stroke">{rank + 1}</span>
                      <span className="pts stroke">{e.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {rest.length > 0 && (
              <ol className="lb-list" start={4}>
                {rest.map((e, i) => (
                  <li key={e.wallet || i} className={`lb-row ${isMe(e) ? 'is-you' : ''}`}>
                    <span className="lb-rank">{i + 4}</span>
                    <span className="lb-avatar" style={identicon(e.wallet)} aria-hidden="true" />
                    <div className="lb-who">
                      <div className="lb-addr">
                        {shortAddr(e.wallet) || e.username}
                        {isMe(e) && <span className="you-tag">You</span>}
                      </div>
                      <div className="lb-level">Reached level {e.level}</div>
                    </div>
                    <span className="lb-score">{e.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </div>
  );
}
