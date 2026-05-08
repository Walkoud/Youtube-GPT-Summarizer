chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    handleSummarize(request.tabId).catch(console.error);
    sendResponse({ status: "started" });
  } else if (request.action === 'summarize_from_page') {
    // Message comes from content script, use sender tab ID
    if (sender && sender.tab) {
      handleSummarize(sender.tab.id).catch(console.error);
    }
    sendResponse({ status: "started" });
  }
});

async function handleSummarize(tabId) {
  try {
    // 1. Execute script in tab to get and parse subtitles
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async () => {
        try {
          // --- STRATEGY 1: DOM Scraping (Reliable if API blocks) ---
          const getTranscriptFromDOM = () => {
            // Support both new and old YouTube DOM structures
            let segments = document.querySelectorAll('transcript-segment-view-model span.ytAttributedStringHost');
            if (segments.length === 0) {
              segments = document.querySelectorAll('ytd-transcript-segment-renderer .segment-text');
            }
            if (segments.length > 0) {
              return Array.from(segments).map(span => span.textContent.trim()).join(' ');
            }
            return null;
          };

          let domTranscript = getTranscriptFromDOM();
          if (domTranscript) {
            return { transcript: domTranscript };
          }

          // If not found, try to open the transcript panel
          // Selectors for the "Show transcript" button
          const openBtn = document.querySelector('ytd-video-description-transcript-section-renderer button, button[aria-label="Afficher la transcription"], button[aria-label="Show transcript"]');
          if (openBtn) {
            openBtn.click();
            // Wait for panel to render
            await new Promise(resolve => setTimeout(resolve, 1500));
            domTranscript = getTranscriptFromDOM();
            if (domTranscript) {
              return { transcript: domTranscript };
            }
          }

          // --- STRATEGY 2: JSON API via ytInitialPlayerResponse (Fallback) ---
          let playerResponse = window.ytInitialPlayerResponse;
          
          if (!playerResponse) {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              if (script.textContent.includes('var ytInitialPlayerResponse = ')) {
                const match = script.textContent.match(/var ytInitialPlayerResponse = ({.*?});/);
                if (match && match[1]) {
                  try {
                    playerResponse = JSON.parse(match[1]);
                    break;
                  } catch (e) {}
                }
              }
            }
          }

          if (!playerResponse || !playerResponse.captions) {
            return { error: "Please open the 'Show transcript' panel on YouTube first (the direct API is blocked)." };
          }

          const renderer = playerResponse.captions.playerCaptionsTracklistRenderer;
          if (!renderer || !renderer.captionTracks || renderer.captionTracks.length === 0) {
            return { error: "No subtitle tracks available for this video." };
          }

          const tracks = renderer.captionTracks;
          let track = tracks.find(t => t.languageCode === 'en') || tracks.find(t => t.languageCode === 'fr') || tracks[0];
          let captionUrl = track.baseUrl;
          
          if (captionUrl.includes('fmt=')) {
            captionUrl = captionUrl.replace(/fmt=[^&]+/, 'fmt=json3');
          } else {
            captionUrl += (captionUrl.includes('?') ? '&' : '?') + 'fmt=json3';
          }

          const response = await fetch(captionUrl);
          if (!response.ok) {
            return { error: `HTTP Error: ${response.status} during fetch.` };
          }
          
          const text = await response.text();
          if (!text) {
            return { error: "YouTube API returned an empty file. Tip: Manually open the 'Show transcript' panel under the video and try again." };
          }
          
          const data = JSON.parse(text);
          let transcript = [];
          if (data && data.events) {
            for (const event of data.events) {
              if (event.segs) {
                for (const seg of event.segs) {
                  if (seg.utf8) {
                    transcript.push(seg.utf8);
                  }
                }
              }
            }
          }
          
          return { transcript: transcript.join('') };
        } catch (err) {
          return { error: err.toString() };
        }
      }
    });
    
    if (!results || !results[0] || !results[0].result) {
      console.error("Failed to execute script on the YouTube page.");
      return;
    }
    
    const result = results[0].result;
    
    if (result.error) {
      console.error("Subtitle extraction error:", result.error);
      return;
    }
    
    let fullTranscript = result.transcript;

    if (!fullTranscript) {
      console.error("Subtitle text is empty.");
      return;
    }
    
    // Security: truncate text if it's excessively long (e.g. 5h video)
    if (fullTranscript.length > 50000) {
        fullTranscript = fullTranscript.substring(0, 50000) + '\n\n[Text truncated because it is too long]';
    }

    // 2. Prepare prompt for ChatGPT
    const { customPrompt } = await chrome.storage.sync.get(['customPrompt']);
    const basePrompt = customPrompt || "Here is the transcript of a YouTube video. Please summarize it in English, highlighting the main points:\n\n";
    const prompt = `${basePrompt}${fullTranscript}`;

    // 3. Open new ChatGPT tab
    const chatGptTab = await chrome.tabs.create({ url: 'https://chatgpt.com/' });

    // 4. Wait for ChatGPT to fully load and inject script
    chrome.tabs.onUpdated.addListener(function listener(tabId, info, tab) {
      if (tabId === chatGptTab.id && info.status === 'complete' && tab.url.includes('chatgpt.com')) {
        chrome.tabs.onUpdated.removeListener(listener);
        injectChatGPT(chatGptTab.id, prompt);
      }
    });

  } catch (err) {
    console.error("Critical error:", err);
  }
}

function injectChatGPT(tabId, promptText) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (text) => {
      const checkInterval = setInterval(() => {
        const editor = document.querySelector('#prompt-textarea');
        if (editor) {
          clearInterval(checkInterval);
          
          // Focus the editor
          editor.focus();
          
          // Insert the text using execCommand which works perfectly with ProseMirror
          document.execCommand('insertText', false, text);
          
          // Wait a bit for the UI to update and the send button to appear
          setTimeout(() => {
            const sendBtn = document.querySelector('button[data-testid="send-button"]');
            if (sendBtn && !sendBtn.disabled) {
              sendBtn.click();
            }
          }, 800);
        }
      }, 500);
      
      setTimeout(() => clearInterval(checkInterval), 15000);
    },
    args: [promptText]
  });
}