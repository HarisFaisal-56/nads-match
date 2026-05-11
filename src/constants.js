import img1 from './assets/images/adedayo.jpg';
import img2 from './assets/images/aromat.jpg';
import img3 from './assets/images/chad cat.jpg';
import img4 from './assets/images/dluv.jpg';
import img5 from './assets/images/infinity Z.jpg';
import img6 from './assets/images/marrcus.jpg';
import img7 from './assets/images/pirate.jpg';
import img8 from './assets/images/real one.jpg';
import img9 from './assets/images/wolf.jpg';

export const CANDY_IMAGES = [
  img1, img2, img3, img4, img5, img6, img7, img8, img9
];

export const BOARD_SIZE = 8;
export const MAX_LEVEL = 30;

export const getLevelConfig = (level) => {
  const tileCount = level <= 3 ? 5 : level <= 8 ? 7 : 9;
  return {
    targetScore: level * 8 + 7,
    moves: Math.max(15, 40 - Math.floor(level / 2)),
    tileCount
  };
};