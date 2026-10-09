/** Shared helpers for the UI layer (no components here, so fast refresh stays happy). */

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

/** Bright two-tone gradient derived from a wallet address, used as an avatar. */
export function identicon(addr = '') {
  const h = parseInt(addr.slice(2, 8) || '0', 16);
  const a = h % 360;
  const b = (a + 60 + (h % 100)) % 360;
  return {
    background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,.55) 0 18%, transparent 19%), linear-gradient(135deg, hsl(${a} 95% 64%), hsl(${b} 90% 52%))`,
  };
}

/** Stars by how far past the target the player went: 1× = 1 star, 1.2× = 2, 1.5× = 3. */
export const STAR_STEPS = [1, 1.2, 1.5];

export function starsFor(score, targetScore) {
  if (!targetScore) return 3;
  return STAR_STEPS.filter((m) => score >= targetScore * m).length || 1;
}

/** What the game shouts as a cascade keeps chaining. */
export const COMBO_WORDS = ['', '', 'Nice!', 'Smashing!', 'Nad-tastic!', 'Unstoppable!'];
