# X Highlighter Chrome Extension

A Chrome extension that highlights X (Twitter) users from a JSON list by adding a crab emoji (🦀) beside their usernames on x.com.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `x_highlighter` directory

<img src="screenshot.png" width="300" />

## Usage

1. Click the extension icon in Chrome toolbar
2. Load your user data JSON file using one of these methods:
   - **From URL**: Enter a URL to a JSON file and click "Load from URL"
   - **From File**: Click "Choose File", select your JSON file, then click "Load from File"
3. The extension will automatically highlight matching users on x.com with a 🦀 emoji

## JSON Format

The JSON file should be an array of user objects. Each object must have a `username` field:

```json
[
  {
    "username": "Ali19805851761",
    "name": "Ali_1980",
    "user_id": "1841426044945080320",
    ...
  },
  ...
]
```

## Features

- Highlights users in real-time as you browse x.com
- Works with X's dynamic React-based interface
- Supports both URL and local file loading
- Automatically processes new content as you scroll
- Case-insensitive username matching

## File Structure

```
x_highlighter/
├── manifest.json          # Extension configuration
├── popup/
│   ├── popup.html         # Settings UI
│   ├── popup.css          # Popup styling
│   └── popup.js           # JSON loading logic
├── content/
│   └── content.js         # DOM manipulation on x.com
├── background/
│   └── background.js      # Service worker for URL fetching
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```
