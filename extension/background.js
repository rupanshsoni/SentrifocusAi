// ────────────────────────────────────────────────────────────
//  Helpers: URL Filtering
// ────────────────────────────────────────────────────────────
const isInternalPage = (url) => {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    !url || url === 'about:blank'
  );
};

const isNewTabPage = (url) => {
  return (
    url.startsWith('https://www.google.com/_/chrome/newtab') ||
    url.includes('chrome://newtab')
  );
};

const extractContext = (url) => {
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace('www.', '');

    if (hostname.includes('youtube.com')) {
      if (u.pathname === '/' || u.pathname === '/feed/trending' || u.pathname.startsWith('/shorts')) {
        return { type: 'youtube_distraction', label: 'YouTube Distraction' };
      }
      const yq = u.searchParams.get('search_query') || u.searchParams.get('q');
      if (yq) return { type: 'youtube_search', label: `Youtube: ${yq}` };
      
      const videoId = u.searchParams.get('v');
      if (videoId) return { type: 'youtube_video', label: `YouTube Video` };
    }

    const gq = u.searchParams.get('q');
    if (gq) return { type: 'search', label: `Search: ${gq}` };

    return { type: 'page', label: hostname };
  } catch (_) {
    return { type: 'page', label: url };
  }
};

// ────────────────────────────────────────────────────────────
//  Core logic
// ────────────────────────────────────────────────────────────

const checkTab = async (tabId, url) => {
  if (isInternalPage(url) || isNewTabPage(url)) return;

  const data = await chrome.storage.local.get(["goal", "active"]);
  if (!data.active || !data.goal) return;

  // Wait 1 second for the page title to update (Crucial for YouTube/Google)
  await new Promise(r => setTimeout(r, 1000));
  
  const tab = await chrome.tabs.get(tabId);
  const title = tab.title || "Unknown Page";
  const ctx = extractContext(url);

  // Hard-block YouTube Home or Shorts immediately
  if (ctx.type === 'youtube_distraction') {
    closeTab(tabId, data.goal);
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:8000/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: data.goal,
        site_title: title,
        url: url,
        context_label: ctx.label
      })
    });

    const result = await response.json();
    if (result.decision === "BLOCKED") {
      closeTab(tabId, data.goal);
    }
  } catch (error) {
    console.error("Backend error:", error);
  }
};

const closeTab = (tabId, goal) => {
  chrome.tabs.remove(tabId);
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Focus Alert!',
    message: `Redirected from distraction. Goal: ${goal}`
  });
};

// ────────────────────────────────────────────────────────────
//  Listeners
// ────────────────────────────────────────────────────────────

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    checkTab(details.tabId, details.url);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) {
    checkTab(details.tabId, details.url);
  }
});