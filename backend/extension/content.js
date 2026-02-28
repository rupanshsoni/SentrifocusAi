chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "BLOCK_TAB") {
    showBlockOverlay(request.goal);
  }
});

function showBlockOverlay(goal) {
  // Prevent duplicate overlays
  if (document.getElementById("sentri-focus-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "sentri-focus-overlay";
  overlay.style = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(44, 62, 80, 0.98); color: white;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 2147483647; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    text-align: center; backdrop-filter: blur(10px);
  `;

  let timeLeft = 5;
  overlay.innerHTML = `
    <div style="padding: 40px; border-radius: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
        <h1 style="font-size: 28px; margin-bottom: 10px;">⚠️ Distraction Detected</h1>
        <p style="font-size: 18px; margin-bottom: 20px;">You should be focusing on:<br><strong style="color: #2ecc71;">${goal}</strong></p>
        <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">This tab will close in</div>
        <div id="sentri-timer" style="font-size: 60px; font-weight: bold; color: #e74c3c;">${timeLeft}</div>
    </div>
  `;

  document.body.appendChild(overlay);

  const timerInterval = setInterval(() => {
    timeLeft--;
    const timerElement = document.getElementById("sentri-timer");
    if (timerElement) timerElement.innerText = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      chrome.runtime.sendMessage({ action: "CLOSE_MY_TAB" });
    }
  }, 1000);
}