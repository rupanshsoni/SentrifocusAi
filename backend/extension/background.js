const isInternalPage = (url) => {
  return url.startsWith('chrome://') || url.startsWith('about:') || url === "";
};

chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.create({ url: 'popup.html' });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focusTimer") {
    chrome.storage.local.set({ active: false });
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Time is Up!',
      message: 'Your focus session has ended.',
      priority: 2
    });
    chrome.tabs.create({ url: 'popup.html' });
  }
});

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
      // INSTEAD OF REMOVING: Send message to content script to start countdown
      chrome.tabs.sendMessage(tabId, { action: "BLOCK_TAB", goal: data.goal });
    }
  } catch (e) { console.error("Backend offline", e); }
};

// Listen for the signal from content script to actually close the tab after 5s
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "CLOSE_MY_TAB" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.get(details.tabId, (tab) => { if(tab) checkTab(tab.id, tab.url, tab.title); });
  }
});