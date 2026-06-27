// Rasterise les SVG de marque en PNG (favicon, apple-touch, PWA).
// Usage : npm i -D sharp && node scripts/gen-icons.mjs   (depuis frontend/)
import sharp from 'sharp';

const A = 'src/assets';
const tasks = [
  [`${A}/icon.svg`,          `${A}/favicon-16.png`,         16],
  [`${A}/icon.svg`,          `${A}/favicon-32.png`,         32],
  [`${A}/icon-maskable.svg`, `${A}/apple-touch-icon.png`,   180],
  [`${A}/icon-maskable.svg`, `${A}/icon-192.png`,           192],
  [`${A}/icon-maskable.svg`, `${A}/icon-512.png`,           512],
  [`${A}/icon-maskable.svg`, `${A}/icon-maskable-512.png`,  512],
];

for (const [src, out, size] of tasks) {
  await sharp(src).resize(size, size).png().toFile(out);
  console.log('✓', out);
}
