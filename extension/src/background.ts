chrome.runtime.onInstalled.addListener(() => {
  console.log("Signoff.ai Extension: Installed.");
});

// Handle external messages from the web app (Auth tokens)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'SIGNOFFAI_AUTH_TOKEN') {
    chrome.storage.local.set({
      authToken: message.token,
      user: message.user,
      expiresAt: Date.now() + 86400000 // 24 hours
    }, () => {
      console.log('Auth token received and stored');
      sendResponse({ success: true });
    });
    return true;
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) return;

  try {
    // Attempt to send message to check if content script is alive
    await chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
  } catch (err) {
    // If it fails, the content script might not be injected yet (e.g. after extension reload)
    console.log("Content script not found, injecting...", err);
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      // Try sending message again after injection
      await chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
    } catch (injectErr) {
      console.error("Failed to inject content script:", injectErr);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SIGNOFFAI_AUTH_TOKEN') {
    chrome.storage.local.set({
      authToken: message.token,
      user: message.user,
      expiresAt: Date.now() + 86400000 // 24 hours
    }, () => {
      console.log('Auth token received from content script and stored');
      sendResponse({ success: true });
    });
    return true;
  }
  if (message.action === "capture_tab") {
    chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // Keep channel open for async response
  }
});
