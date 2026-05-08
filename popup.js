const defaultPrompt = "Here is the transcript of a YouTube video. Please summarize it in English, highlighting the main points:\n\n";

document.addEventListener('DOMContentLoaded', () => {
  const promptInput = document.getElementById('promptInput');
  chrome.storage.sync.get(['customPrompt'], (result) => {
    promptInput.value = result.customPrompt || defaultPrompt;
  });
});

document.getElementById('savePromptBtn').addEventListener('click', () => {
  const promptInput = document.getElementById('promptInput');
  const statusDiv = document.getElementById('status');
  chrome.storage.sync.set({ customPrompt: promptInput.value }, () => {
    statusDiv.textContent = 'Prompt saved!';
    setTimeout(() => { statusDiv.textContent = ''; }, 2000);
  });
});

document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Extracting transcript...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('youtube.com/watch')) {
      statusDiv.textContent = 'Please open a YouTube video.';
      return;
    }

    chrome.runtime.sendMessage({ action: 'summarize', tabId: tab.id }, (response) => {
      // Close popup after sending the command
      window.close();
    });
  } catch (err) {
    statusDiv.textContent = 'Error: ' + err.message;
  }
});