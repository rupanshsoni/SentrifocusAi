document.getElementById('start').addEventListener('click', () => {
  const goal = document.getElementById('goal').value;
  if (!goal) return alert("Please enter a goal!");

  chrome.storage.local.set({ goal: goal, active: true }, () => {
    document.getElementById('status').innerText = "Focus Mode: ON";
  });
});

document.getElementById('stop').addEventListener('click', () => {
  chrome.storage.local.set({ active: false }, () => {
    document.getElementById('status').innerText = "Focus Mode: OFF";
  });
});