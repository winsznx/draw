// Renders deck.html to DRAW-deck.pdf, one 1600x900 page per slide.
// Usage: node docs/pitch/export-pdf.mjs   (needs web/node_modules and Google Chrome)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, '../../web/package.json'))('@playwright/test');

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(pathToFileURL(path.join(here, 'deck.html')).href, { waitUntil: 'networkidle' });

  // document.fonts.check() reports true when no face is registered at all, as
  // happens when Google Fonts is unreachable, so ask for each face by loading it.
  const missing = await page.evaluate(async (fonts) => {
    const failed = [];
    for (const font of fonts) if ((await document.fonts.load(font)).length === 0) failed.push(font);
    return failed;
  }, ['550 58px "Schibsted Grotesk"', '400 14px "JetBrains Mono"']);
  if (missing.length) throw new Error(`Fonts did not load, refusing to export with fallbacks: ${missing.join(', ')}`);
  await page.evaluate(() => document.fonts.ready);

  const broken = await page.evaluate(() =>
    [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')),
  );
  if (broken.length) throw new Error(`Images failed to load: ${broken.join(', ')}`);

  const slides = await page.locator('section.slide').count();
  await page.emulateMedia({ media: 'print' });
  const out = path.join(here, 'DRAW-deck.pdf');
  await page.pdf({ path: out, width: '1600px', height: '900px', printBackground: true, preferCSSPageSize: true });
  console.log(`${slides} slides written to ${path.relative(process.cwd(), out)}`);
} finally {
  await browser.close();
}
