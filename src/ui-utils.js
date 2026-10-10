/** Shared helpers for the UI layer (no components here, so fast refresh stays happy). */

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

/*
 * Wallet avatar: a small mirrored pixel pattern ("blockie") generated from the
 * address, the same style MetaMask and block explorers use. Every wallet gets
 * its own pattern and colours, and the same wallet always gets the same one.
 * Pure function of the address: no network calls, no images to load.
 */
const BLOCKIE_SIZE = 8;
const blockieCache = new Map();

function blockieSvg(seedText) {
  // xorshift PRNG seeded from the address text
  const seed = [0, 0, 0, 0];
  for (let i = 0; i < seedText.length; i++) {
    seed[i % 4] = ((seed[i % 4] << 5) - seed[i % 4] + seedText.charCodeAt(i)) | 0;
  }
  const rand = () => {
    const t = seed[0] ^ (seed[0] << 11);
    seed[0] = seed[1];
    seed[1] = seed[2];
    seed[2] = seed[3];
    seed[3] = seed[3] ^ (seed[3] >> 19) ^ t ^ (t >> 8);
    return (seed[3] >>> 0) / 2147483648 % 1;
  };
  const color = () => {
    const h = Math.floor(rand() * 360);
    const sat = Math.round(rand() * 60 + 40);
    const light = Math.round((rand() + rand() + rand() + rand()) * 25);
    return `hsl(${h} ${sat}% ${light}%)`;
  };
  const fg = color();
  const bg = color();
  const spot = color();

  // left half is random, right half mirrors it
  const half = Math.ceil(BLOCKIE_SIZE / 2);
  let rects = '';
  for (let y = 0; y < BLOCKIE_SIZE; y++) {
    const row = Array.from({ length: half }, () => Math.floor(rand() * 2.3));
    const full = row.concat(row.slice(0, BLOCKIE_SIZE - half).reverse());
    full.forEach((v, x) => {
      if (v) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${v === 1 ? fg : spot}"/>`;
    });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BLOCKIE_SIZE} ${BLOCKIE_SIZE}" shape-rendering="crispEdges"><rect width="${BLOCKIE_SIZE}" height="${BLOCKIE_SIZE}" fill="${bg}"/>${rects}</svg>`;
  return { bg, url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };
}

/** Inline style for a wallet avatar (chip, leaderboard podium and rows). */
export function identicon(addr = '') {
  const key = String(addr || '').toLowerCase();
  let b = blockieCache.get(key);
  if (!b) {
    b = blockieSvg(key || '0x');
    blockieCache.set(key, b);
  }
  return {
    backgroundColor: b.bg,
    backgroundImage: b.url,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
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
