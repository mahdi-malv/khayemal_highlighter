// DOM elements
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const fileInput = document.getElementById('fileInput');
const loadFileBtn = document.getElementById('loadFileBtn');
const status = document.getElementById('status');
const userCount = document.getElementById('userCount');
const clearBtn = document.getElementById('clearBtn');

// Show status message
function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  setTimeout(() => {
    status.className = 'status';
  }, 5000);
}

// Update user count display
function updateUserCount() {
  chrome.storage.local.get(['users'], (result) => {
    const users = result.users || [];
    if (users.length > 0) {
      userCount.textContent = `Loaded: ${users.length} users`;
    } else {
      userCount.textContent = '';
    }
  });
}

// Validate and process user data
function processUserData(data) {
  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array of user objects');
  }

  const users = [];
  for (const user of data) {
    if (user.username) {
      users.push({
        username: user.username,
        name: user.name || user.username,
        user_id: user.user_id || null
      });
    }
  }

  if (users.length === 0) {
    throw new Error('No valid users found in JSON (users must have a "username" field)');
  }

  return users;
}

// Save users to storage
function saveUsers(users) {
  chrome.storage.local.set({ users }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Error saving data: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus(`Successfully loaded ${users.length} users!`, 'success');
      updateUserCount();
      // Notify content script to reload
      chrome.tabs.query({ url: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'reload' }).catch(() => {
            // Ignore errors if content script isn't ready
          });
        });
      });
    }
  });
}

// Load from URL
loadUrlBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    showStatus('Please enter a URL', 'error');
    return;
  }

  loadUrlBtn.disabled = true;
  loadUrlBtn.textContent = 'Loading...';

  try {
    // Send message to background script to fetch URL (bypasses CORS)
    chrome.runtime.sendMessage({ action: 'fetchUrl', url }, (response) => {
      loadUrlBtn.disabled = false;
      loadUrlBtn.textContent = 'Load from URL';

      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      if (response.error) {
        showStatus('Error: ' + response.error, 'error');
        return;
      }

      try {
        const users = processUserData(response.data);
        saveUsers(users);
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });
  } catch (error) {
    loadUrlBtn.disabled = false;
    loadUrlBtn.textContent = 'Load from URL';
    showStatus('Error: ' + error.message, 'error');
  }
});

// Function to load file
function loadFile() {
  const file = fileInput.files[0];
  if (!file) {
    showStatus('Please select a JSON file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const users = processUserData(data);
      saveUsers(users);
    } catch (error) {
      if (error instanceof SyntaxError) {
        showStatus('Invalid JSON file', 'error');
      } else {
        showStatus(error.message, 'error');
      }
    }
  };

  reader.onerror = () => {
    showStatus('Error reading file', 'error');
  };

  reader.readAsText(file);
}

// Load from file - button click
loadFileBtn.addEventListener('click', loadFile);

// Load from file - auto-load when file is selected
fileInput.addEventListener('change', loadFile);

// Clear data
clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['users'], () => {
    showStatus('Data cleared', 'success');
    updateUserCount();
    // Notify content script
    chrome.tabs.query({ url: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'reload' }).catch(() => {});
      });
    });
  });
});

// Initialize
updateUserCount();
