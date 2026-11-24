// Settings shared by the content script and the options page.
/* exported DEFAULT_BLOCKED_PHRASES, getBlockedPhrases, buildBlockedPattern */
const DEFAULT_BLOCKED_PHRASES = ['pronoun', 'as of', 'most fans', 'most anticipated', 'so far'];

async function getBlockedPhrases() {
  const { blockedPhrases } = await chrome.storage.sync.get({
    blockedPhrases: DEFAULT_BLOCKED_PHRASES,
  });
  return blockedPhrases;
}

// Return a case-insensitive pattern that matches a phrase at the start of a word.
// Return null if there are no phrases.
function buildBlockedPattern(phrases) {
  if (!phrases.length) return null;
  const escaped = phrases.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<!\\w)(${escaped.join('|')})`, 'i');
}
