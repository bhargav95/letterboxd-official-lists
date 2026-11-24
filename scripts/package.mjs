// Check the manifest, then zip extension/ into dist/ for the Chrome Web Store.
// Run: node scripts/package.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { checkManifest, extDir, reportErrors } from './check-manifest.mjs';

const { manifest, errors } = checkManifest();
if (errors.length) {
  reportErrors(errors);
  process.exit(1);
}

const root = path.dirname(extDir);
const distDir = path.join(root, 'dist');
const zipPath = path.join(distDir, `official-lists-for-letterboxd-${manifest.version}.zip`);
fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(zipPath, { force: true });
// -X leaves out macOS file attributes. Zip from inside extension/ so that manifest.json is at the
// root of the ZIP, as the store requires.
execFileSync('zip', ['-r', '-X', zipPath, '.', '-x', '*.DS_Store'], {
  cwd: extDir,
  stdio: 'ignore',
});

const kb = (fs.statSync(zipPath).size / 1024).toFixed(1);
console.log(`Wrote ${path.relative(root, zipPath)} (${kb} KB)`);
