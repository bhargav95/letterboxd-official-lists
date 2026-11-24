// Options page. settings.js loads first and supplies the defaults and getBlockedPhrases().
/* global DEFAULT_BLOCKED_PHRASES, getBlockedPhrases */
const textarea = document.getElementById('phrases');
const statusEl = document.getElementById('status');
let statusTimer;

function showStatus(message) {
  clearTimeout(statusTimer);
  statusEl.textContent = message;
  statusTimer = setTimeout(() => (statusEl.textContent = ''), 2000);
}

// Keep one entry per phrase. Matching ignores case, so store phrases in lowercase.
function parsePhrases(text) {
  const phrases = text.split('\n').map((line) => line.trim().toLowerCase());
  return [...new Set(phrases.filter(Boolean))];
}

async function save(phrases) {
  try {
    await chrome.storage.sync.set({ blockedPhrases: phrases });
    textarea.value = phrases.join('\n');
    showStatus('Saved.');
  } catch (err) {
    showStatus(`Could not save: ${err.message}`);
  }
}

getBlockedPhrases().then((phrases) => (textarea.value = phrases.join('\n')));
document.getElementById('save').addEventListener('click', () => save(parsePhrases(textarea.value)));
document.getElementById('reset').addEventListener('click', () => save(DEFAULT_BLOCKED_PHRASES));
