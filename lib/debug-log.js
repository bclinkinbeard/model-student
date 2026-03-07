// Shared debug logger — appends timestamped messages to #debug-log textarea.
// Import and call debug() from any page's wiring layer.

const textarea = document.getElementById('debug-log');
const STORAGE_KEY = 'debug-log-prev';

export function debug(message) {
  if (!textarea) return;
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
  textarea.value += `[${ts}] ${message}\n`;
  textarea.scrollTop = textarea.scrollHeight;
}

// --- Reload detection ---

// Check navigation type on load
const navEntry = performance.getEntriesByType('navigation')[0];
if (navEntry && textarea) {
  const prev = sessionStorage.getItem(STORAGE_KEY);
  if (navEntry.type === 'reload' && prev) {
    textarea.value += `--- PAGE RELOADED (previous session log below) ---\n${prev}\n--- END PREVIOUS LOG ---\n\n`;
  }
  debug(`Page loaded (navigation type: ${navEntry.type})`);
}

// Save log to sessionStorage before unload so it survives a reload
window.addEventListener('beforeunload', () => {
  if (textarea) {
    sessionStorage.setItem(STORAGE_KEY, textarea.value);
  }
});

// Wire up the clear button if present
const clearBtn = document.getElementById('debug-clear');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    textarea.value = '';
  });
}
