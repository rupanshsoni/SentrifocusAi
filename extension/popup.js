document.getElementById('start').addEventListener('click', () => {
  const goal = document.getElementById('goal').value;
  const mins = parseInt(document.getElementById('minutes').value);

  if (!goal || !mins) return alert("Please set both a goal and a time!");

  // Calculate the timestamp when the session should end
  const endTime = Date.now() + (mins * 60000);

  chrome.storage.local.set({ 
    goal: goal, 
    active: true, 
    endTime: endTime 
  }, () => {
    // Create an alarm that triggers in the background
    chrome.alarms.create("focusTimer", { delayInMinutes: mins });
    document.getElementById('status').innerText = `Focusing for ${mins}m...`;
    
    // Optional: Close popup so they get to work
    setTimeout(() => window.close(), 1000);
  });
});

document.getElementById('stop').addEventListener('click', () => {
  chrome.storage.local.set({ active: false }, () => {
    chrome.alarms.clear("focusTimer");
    document.getElementById('status').innerText = "Session Stopped.";
  });
});

// Update status on open
chrome.storage.local.get(["active", "goal"], (data) => {
  if (data.active) {
    document.getElementById('status').innerText = `Focusing on: ${data.goal}`;
  }
});