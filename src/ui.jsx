import { Volume2, VolumeX } from 'lucide-react';
import { useMuted, setMuted, unlockAudio, sfx } from './sound';

/** Small presentational pieces shared across screens. */

const STAR_PATH = 'M12 1.6l3.1 6.4 7 1-5.1 4.9 1.2 7L12 17.6l-6.2 3.3 1.2-7L1.9 9l7-1z';

/** Big outlined game title text (stroke + gradient fill layers via CSS). */
export function OText({ children, variant, className = '', as: Tag = 'span', ...rest }) {
  const text = String(children);
  return (
    <Tag className={`otext ${variant ? `otext--${variant}` : ''} ${className}`} data-text={text} {...rest}>
      {text}
    </Tag>
  );
}

export function StarShape({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={STAR_PATH} />
    </svg>
  );
}

export function Crown({ className = 'crown' }) {
  return (
    <svg className={className} viewBox="0 0 36 28" aria-hidden="true">
      <path fill="currentColor" d="M3 8l8 7 7-12 7 12 8-7-3 17H6z" />
    </svg>
  );
}

/** Pink (or other colour) banner with folded tails. */
export function Ribbon({ children, tone = '', className = '' }) {
  return (
    <div className={`ribbon ${tone ? `ribbon--${tone}` : ''} ${className}`}>
      <div className="ribbon-band">
        <OText variant="white">{children}</OText>
      </div>
    </div>
  );
}

/** Characters bobbing around the edges of the screen. Decorative only. */
export function Floaters({ images, spots }) {
  return (
    <div className="floaters" aria-hidden="true">
      {spots.map((s, i) => (
        <span
          key={i}
          className={`floater ${s.wide ? 'is-wide' : ''}`}
          style={{
            backgroundImage: `url(${images[s.img % images.length]})`,
            left: s.x,
            top: s.y,
            '--s': `${s.size}px`,
            '--r': `${s.rot}deg`,
            '--d': `${s.delay}s`,
            opacity: s.op ?? 0.9,
          }}
        />
      ))}
    </div>
  );
}

/** Falling confetti for the win screen. */
const CONFETTI_COLORS = ['#FFE66B', '#FF4FA3', '#6CC8FF', '#8BF05A', '#A88BFF', '#FF8A80'];

export function Confetti({ count = 36 }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        // deterministic spread so every render looks the same
        const x = (i * 37) % 100;
        const d = ((i * 13) % 20) / 10;
        const t = 2.2 + ((i * 7) % 10) / 10;
        const w = 8 + ((i * 5) % 7);
        return (
          <i
            key={i}
            style={{
              '--x': `${x}%`,
              '--d': `${d}s`,
              '--t': `${t}s`,
              '--w': `${w}px`,
              '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              '--rot': `${360 + ((i * 47) % 400)}deg`,
              '--sway': `${((i % 5) - 2) * 25}px`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Round sound on/off button. */
export function MuteButton({ small = false }) {
  const muted = useMuted();
  return (
    <button
      type="button"
      className={`rbtn rbtn--blue ${small ? 'rbtn--sm' : ''}`}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      aria-pressed={muted}
      onClick={() => {
        unlockAudio();
        setMuted(!muted);
        if (muted) sfx.tap();
      }}
    >
      {muted ? <VolumeX size={small ? 20 : 22} strokeWidth={3} /> : <Volume2 size={small ? 20 : 22} strokeWidth={3} />}
    </button>
  );
}
