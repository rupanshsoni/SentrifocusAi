// Whitelist internal chrome pages so they don't get blocked
const isInternalPage = (url) => {
  return url.startsWith('chrome://') || url.startsWith('about:') || url === "";
};

// 1. Force Dashboard on Startup
chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.create({ url: 'popup.html' });
});

// 2. Handle Timer Expiration
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focusTimer") {
    chrome.storage.local.set({ active: false });
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Time is Up!',
      message: 'Your focus session has ended. Ready for another?',
      priority: 2
    });

    // Re-open dashboard for next task
    chrome.tabs.create({ url: 'popup.html' });
  }
});

// 3. The Interceptor Logic
const checkTab = async (tabId, url, title) => {
  if (isInternalPage(url)) return;

  const data = await chrome.storage.local.get(["goal", "active"]);
  if (!data.active) return;

  try {
    const response = await fetch("http://127.0.0.1:8000/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: data.goal,
        site_title: title || "New Tab",
        url: url
      })
    });

    const result = await response.json();
    if (result.decision === "BLOCKED") {
      chrome.tabs.remove(tabId);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'SentriFocus Blocked This',
        message: `Stay focused on: ${data.goal}`
      });
    }
  } catch (e) { console.error("Backend offline", e); }
};

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.get(details.tabId, (tab) => { if(tab) checkTab(tab.id, tab.url, tab.title); });
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.get(details.tabId, (tab) => { if(tab) checkTab(tab.id, tab.url, tab.title); });
  }
});