export default {
  '*.{js,mjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,css,html,md}': 'prettier --write',
  // Use a function so that lint-staged does not append the staged file names.
  'extension/**': () => 'node scripts/check-manifest.mjs',
};
