# YouTube to ChatGPT Summarizer

A simple, lightweight Chrome Extension that adds a **"Summarize"** button directly to YouTube videos. With one click, it extracts the video's transcript, opens a new ChatGPT tab, and automatically prompts ChatGPT to summarize the content for you.

## Features

- 🎯 **Native Integration:** Adds a "Summarize" button directly into the YouTube player's action menu (next to Like, Share, Download).
- 🧠 **Automatic Prompting:** Opens ChatGPT and seamlessly pastes the transcript with your custom instructions.
- ⚙️ **Customizable Prompts:** You can modify the default ChatGPT prompt via the extension's popup to extract exactly the information you need.
- 🛡️ **Robust Extraction:** Uses fallback strategies (DOM Scraping + API) to ensure transcripts are captured even when YouTube's anti-bot protections block API requests.

<img width="750" height="123" alt="image" src="https://github.com/user-attachments/assets/69136a75-1f70-44e2-964d-c0ee435f5a32" />

<img width="279" height="310" alt="image" src="https://github.com/user-attachments/assets/59eaa0f6-2f49-443c-a85a-18851d68e1af" />

## Installation

### For Developers / Manual Installation

1. Clone or download this repository.
2. Open Google Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click on **"Load unpacked"** in the top left corner.
5. Select the folder where you saved this repository (`ResumeYoutube`).
6. The extension is now installed! You should see the YouTube Summarizer icon in your toolbar.

## How to Use

1. Go to any YouTube video that has subtitles/closed captions.
2. Under the video player, click the **"Summarize"** button (next to the Share button).
   *(Alternatively, click the extension icon in your Chrome toolbar and click "Summarize with ChatGPT".)*
3. A new ChatGPT tab will open automatically.
4. The extension will paste the transcript and send the prompt for you.
5. Wait for ChatGPT to generate your summary!

### Customizing the Prompt

1. Click on the extension icon in the top right of your Chrome browser.
2. Edit the text in the "ChatGPT Prompt" text area.
3. Click **"Save Prompt"**. Your custom instructions will be used for all future summaries.

## How it Works

Because YouTube frequently updates its UI and blocks direct API calls from background scripts, this extension uses a hybrid approach:
1. **DOM Scraping (Primary):** The extension reads the `<transcript-segment-view-model>` elements directly from the YouTube page to ensure accurate, unblocked extraction.
2. **API Fallback:** If the panel isn't available, it parses the `window.ytInitialPlayerResponse` object to fetch the `timedtext` JSON API.
3. **ChatGPT Injection:** Once the text is ready, it opens `chatgpt.com` and injects a script to interact with the ProseMirror editor and automatically trigger the send button.

## Permissions

- `activeTab`: To read the current YouTube tab url.
- `scripting`: To inject the extraction script into YouTube and the paste script into ChatGPT.
- `tabs`: To open and track the newly created ChatGPT tab.
- `storage`: To save your custom ChatGPT prompt.

## License

This project is open-source and free to use. MIT License.
