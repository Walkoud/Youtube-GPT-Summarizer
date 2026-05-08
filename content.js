// content.js - Injects the "Summarize" button into the YouTube interface

function injectSummarizeButton() {
  // Check if the button already exists
  if (document.getElementById('youtube-summarize-btn')) return true;

  // Target: the toolbar under the video
  // We specifically target the area under the main video player
  const targetMenu = document.querySelector('ytd-watch-metadata #top-level-buttons-computed, #menu.ytd-watch-metadata #top-level-buttons-computed');
  
  if (!targetMenu) {
    return false;
  }

  console.log("[YouTubeSummarizer] Injecting 'Summarize' button...");

  // Create the button with YouTube-like styling
  const btn = document.createElement('button');
  btn.id = 'youtube-summarize-btn';
  btn.title = "Summarize with ChatGPT";
  // Emulate existing YouTube button styles (tonal)
  btn.style.cssText = `
    background-color: rgba(255, 255, 255, 0.1);
    color: #f1f1f1;
    border: none;
    border-radius: 18px;
    padding: 0 16px;
    height: 36px;
    font-size: 14px;
    font-family: "Roboto", "Arial", sans-serif;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 8px;
    transition: background-color 0.2s;
  `;

  // SVG lightning bolt icon
  const iconSvg = `
    <svg viewBox="0 0 24 24" style="width:20px;height:20px;margin-right:6px;fill:currentColor;">
      <path d="M13 2.03v7.97h7l-9 12v-7.97H4l9-12z"></path>
    </svg>
  `;
  
  btn.innerHTML = `${iconSvg} Summarize`;

  btn.addEventListener('mouseover', () => {
    btn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  });
  
  btn.addEventListener('mouseout', () => {
    btn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });

  // Click action
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Please wait...';
    
    // Send message to background script
    chrome.runtime.sendMessage({ action: 'summarize_from_page' });
    
    setTimeout(() => {
       btn.innerHTML = originalText;
    }, 3000);
  });

  // Insert at the end of the menu, next to the Share/Download buttons
  targetMenu.appendChild(btn);
  console.log("[YouTubeSummarizer] 'Summarize' button injected successfully!");
  return true;
}

// MutationObserver is needed because YouTube navigates without full page reloads (SPA)
const observer = new MutationObserver(() => {
  if (window.location.pathname === '/watch') {
    injectSummarizeButton();
  }
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Initial attempts on load
setTimeout(injectSummarizeButton, 1000);
setTimeout(injectSummarizeButton, 3000);