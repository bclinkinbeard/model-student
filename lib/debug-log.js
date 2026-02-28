// Shared debug logger — appends timestamped messages to #debug-log textarea.
// Import and call debug() from any page's wiring layer.

const textarea = document.getElementById('debug-log');

export function debug(message) {
  if (!textarea) return;
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
  textarea.value += `[${ts}] ${message}\n`;
  textarea.scrollTop = textarea.scrollHeight;
}

// Wire up the clear button if present
const clearBtn = document.getElementById('debug-clear');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    textarea.value = '';
  });
}
