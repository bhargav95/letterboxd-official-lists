// Check extension/manifest.json and the files it references.
// Run: node scripts/check-manifest.mjs. Exit code 1 means a check failed.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const extDir = path.resolve(import.meta.dirname, '../extension');

// Return the parsed manifest and a list of error messages.
export function checkManifest() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
  } catch (err) {
    return { manifest: null, errors: [`Cannot read manifest.json: ${err.message}`] };
  }

  const errors = [];
  if (manifest.manifest_version !== 3) errors.push('"manifest_version" must be 3.');
  for (const key of ['name', 'version', 'description']) {
    if (!manifest[key]) errors.push(`"${key}" is missing.`);
  }
  // Chrome accepts one to four dot-separated integers.
  if (!/^\d+(\.\d+){0,3}$/.test(manifest.version ?? '')) errors.push('"version" is not valid.');
  if ((manifest.description ?? '').length > 132) {
    errors.push('"description" is longer than 132 characters.');
  }
  if (!manifest.icons?.['128']) errors.push('A 128 px icon is required for the store.');

  const referenced = [
    ...Object.values(manifest.icons ?? {}),
    manifest.options_ui?.page,
    ...(manifest.content_scripts ?? []).flatMap((s) => [...(s.js ?? []), ...(s.css ?? [])]),
  ].filter(Boolean);
  for (const file of referenced) {
    if (!fs.existsSync(path.join(extDir, file))) errors.push(`File "${file}" does not exist.`);
  }
  return { manifest, errors };
}

export function reportErrors(errors) {
  console.error(`manifest.json has ${errors.length} error(s):\n- ${errors.join('\n- ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors } = checkManifest();
  if (errors.length) {
    reportErrors(errors);
    process.exit(1);
  }
  console.log('manifest.json: OK');
}
