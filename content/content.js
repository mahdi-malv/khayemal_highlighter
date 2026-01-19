// Content script for highlighting users on X.com

let usernameSet = new Set();
let observer = null;
let isProcessing = false;

// Load users from storage
function loadUsers() {
  chrome.storage.local.get(['users'], (result) => {
    const users = result.users || [];
    usernameSet = new Set(users.map(u => u.username.toLowerCase()));
    processPage();
  });
}

// Check if element is already highlighted
function isHighlighted(element) {
  return element.hasAttribute('data-x-highlighted');
}

// Mark element as highlighted
function markHighlighted(element) {
  element.setAttribute('data-x-highlighted', 'true');
}

// Extract username from various X.com DOM structures
function extractUsername(element) {
  // Try to find username in common X.com structures
  // Method 1: Check href attribute (e.g., <a href="/username">)
  const link = element.closest('a[href^="/"]');
  if (link) {
    const href = link.getAttribute('href');
    const match = href.match(/^\/([^\/\?]+)/);
    if (match && match[1] && match[1] !== 'home' && match[1] !== 'explore' && match[1] !== 'notifications' && match[1] !== 'messages') {
      return match[1].toLowerCase();
    }
  }

  // Method 2: Check for data-testid="User-Name" and look for @username pattern
  const userNameElement = element.closest('[data-testid="User-Name"]');
  if (userNameElement) {
    const text = userNameElement.textContent || '';
    const atMatch = text.match(/@(\w+)/);
    if (atMatch) {
      return atMatch[1].toLowerCase();
    }
  }

  // Method 3: Look for @username in text content
  const text = element.textContent || '';
  const atMatch = text.match(/@(\w+)/);
  if (atMatch) {
    return atMatch[1].toLowerCase();
  }

  // Method 4: Check aria-label for username
  const ariaLabel = element.getAttribute('aria-label') || element.closest('[aria-label]')?.getAttribute('aria-label') || '';
  const ariaMatch = ariaLabel.match(/@(\w+)/);
  if (ariaMatch) {
    return ariaMatch[1].toLowerCase();
  }

  return null;
}

// Add emoji to username element
function addEmoji(element) {
  if (isHighlighted(element)) {
    return;
  }

  // Find the text node or span containing the username
  const textContent = element.textContent || '';
  
  // Check if emoji already exists
  if (textContent.includes('🦀')) {
    markHighlighted(element);
    return;
  }

  // Add emoji after the username
  // Try to find the actual username text node
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let textNode;
  while (textNode = walker.nextNode()) {
    const text = textNode.textContent;
    if (text && (text.includes('@') || text.trim().length > 0)) {
      // Insert emoji after this text node
      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = ' 🦀';
      emojiSpan.style.marginLeft = '4px';
      textNode.parentNode.insertBefore(emojiSpan, textNode.nextSibling);
      markHighlighted(element);
      return;
    }
  }

  // Fallback: append emoji to element
  const emojiSpan = document.createElement('span');
  emojiSpan.textContent = ' 🦀';
  emojiSpan.style.marginLeft = '4px';
  element.appendChild(emojiSpan);
  markHighlighted(element);
}

// Process a single element
function processElement(element) {
  const username = extractUsername(element);
  if (username && usernameSet.has(username)) {
    addEmoji(element);
  }
}

// Process all username elements on the page
function processPage() {
  if (isProcessing || usernameSet.size === 0) {
    return;
  }

  isProcessing = true;

  // Strategy 1: Find all links that look like user profiles
  const userLinks = document.querySelectorAll('a[href^="/"][href*="/"]');
  userLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('/home') && !href.includes('/explore') && !href.includes('/notifications') && !href.includes('/messages') && !href.includes('/i/')) {
      const match = href.match(/^\/([^\/\?]+)/);
      if (match && match[1]) {
        const username = match[1].toLowerCase();
        if (usernameSet.has(username)) {
          // Find the text element within this link
          const textElement = link.querySelector('span') || link;
          if (!isHighlighted(textElement)) {
            addEmoji(textElement);
          }
        }
      }
    }
  });

  // Strategy 2: Find elements with User-Name testid
  const userNameElements = document.querySelectorAll('[data-testid="User-Name"]');
  userNameElements.forEach(element => {
    processElement(element);
  });

  // Strategy 3: Find all spans/elements containing @username
  const allElements = document.querySelectorAll('span, div, a');
  allElements.forEach(element => {
    if (!isHighlighted(element)) {
      const username = extractUsername(element);
      if (username && usernameSet.has(username)) {
        addEmoji(element);
      }
    }
  });

  isProcessing = false;
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced process function
const debouncedProcess = debounce(processPage, 300);

// Setup MutationObserver
function setupObserver() {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
      }
    });
    if (shouldProcess) {
      debouncedProcess();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for reload messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reload') {
    loadUsers();
  }
});

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupObserver();
  });
} else {
  loadUsers();
  setupObserver();
}

// Also process on navigation (X.com is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Clear highlights and reprocess
    document.querySelectorAll('[data-x-highlighted="true"]').forEach(el => {
      el.removeAttribute('data-x-highlighted');
      const emoji = el.querySelector('span:last-child');
      if (emoji && emoji.textContent.includes('🦀')) {
        emoji.remove();
      }
    });
    setTimeout(processPage, 1000);
  }
}).observe(document, { subtree: true, childList: true });
