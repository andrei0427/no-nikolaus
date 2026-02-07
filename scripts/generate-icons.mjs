import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

const svgContent = readFileSync(join(iconsDir, 'icon.svg'));

// Generate PNG icons
async function generateIcons() {
  // 192x192 icon
  await sharp(svgContent)
    .resize(192, 192)
    .png()
    .toFile(join(iconsDir, 'icon-192.png'));

  console.log('Generated icon-192.png');

  // 512x512 icon
  await sharp(svgContent)
    .resize(512, 512)
    .png()
    .toFile(join(iconsDir, 'icon-512.png'));

  console.log('Generated icon-512.png');

  // Favicon (32x32)
  await sharp(svgContent)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.png'));

  // Also create an ICO-like favicon
  await sharp(svgContent)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.ico'));

  console.log('Generated favicon');
}

generateIcons().catch(console.error);
