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

// Extract username from X.com username display elements only
function extractUsername(element) {
  // Only target the actual username display, not mentions in content
  
  // Method 1: Check for data-testid="User-Name" - this is the username display in X's UI
  const userNameElement = element.closest('[data-testid="User-Name"]');
  if (userNameElement) {
    // Find the link within User-Name that contains the actual username
    const link = userNameElement.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/^\/([^\/\?]+)/);
      if (match && match[1] && 
          match[1] !== 'home' && 
          match[1] !== 'explore' && 
          match[1] !== 'notifications' && 
          match[1] !== 'messages' &&
          match[1] !== 'i' &&
          !match[1].startsWith('search') &&
          !match[1].startsWith('hashtag')) {
        return match[1].toLowerCase();
      }
    }
    // Fallback: extract from text content of User-Name element
    const text = userNameElement.textContent || '';
    const atMatch = text.match(/@(\w+)/);
    if (atMatch) {
      return atMatch[1].toLowerCase();
    }
  }

  // Method 2: Check if element is a profile link in author/header context
  // Only process links that are in article headers or user card contexts
  const link = element.closest('a[href^="/"]');
  if (link) {
    // Check if this link is in a user header/author section, not in tweet content
    const isInAuthorSection = link.closest('article')?.querySelector('[data-testid="User-Name"]') ||
                              link.closest('[data-testid="UserCell"]') ||
                              link.closest('[data-testid="User-Names"]') ||
                              link.closest('div[role="group"]')?.querySelector('[data-testid="User-Name"]');
    
    if (isInAuthorSection) {
      const href = link.getAttribute('href');
      const match = href.match(/^\/([^\/\?]+)/);
      if (match && match[1] && 
          match[1] !== 'home' && 
          match[1] !== 'explore' && 
          match[1] !== 'notifications' && 
          match[1] !== 'messages' &&
          match[1] !== 'i' &&
          !match[1].startsWith('search') &&
          !match[1].startsWith('hashtag')) {
        return match[1].toLowerCase();
      }
    }
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

// Process all username display elements on the page
function processPage() {
  if (isProcessing || usernameSet.size === 0) {
    return;
  }

  isProcessing = true;

  // Only target User-Name elements - these are the actual username displays
  // This ensures we only highlight the username, not mentions in tweet content
  const userNameElements = document.querySelectorAll('[data-testid="User-Name"]');
  userNameElements.forEach(element => {
    if (isHighlighted(element)) {
      return;
    }

    // Find the link or span containing the username within User-Name
    const link = element.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/^\/([^\/\?]+)/);
      if (match && match[1] && 
          match[1] !== 'home' && 
          match[1] !== 'explore' && 
          match[1] !== 'notifications' && 
          match[1] !== 'messages' &&
          match[1] !== 'i' &&
          !match[1].startsWith('search') &&
          !match[1].startsWith('hashtag')) {
        const username = match[1].toLowerCase();
        if (usernameSet.has(username)) {
          // Add emoji to the link or its text content span
          const textElement = link.querySelector('span') || link;
          if (!isHighlighted(textElement)) {
            addEmoji(textElement);
          }
        }
      }
    } else {
      // Fallback: extract username from text and add emoji to the element itself
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
