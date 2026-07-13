import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logo = path.join(raiz, 'apps/web/public/logo-sindicato.png');
const outDir = path.join(raiz, 'apps/web/public/icons');
const azulPlaca = { r: 11, g: 61, b: 107, alpha: 1 };

await mkdir(outDir, { recursive: true });

for (const size of [192, 512]) {
  await sharp(logo)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outDir, `pwa-${size}.png`));
}

await sharp(logo)
  .resize(410, 410, { fit: 'contain', background: azulPlaca })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: azulPlaca })
  .png()
  .toFile(path.join(outDir, 'pwa-512-maskable.png'));

console.log('Ícones PWA gerados em apps/web/public/icons/');
