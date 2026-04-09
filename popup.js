// -----------------------------------------------
// popup.js — Job Auto Fill
// Handles the "Auto Fill" button click.
// Sends a message to the active tab's content.js.
// -----------------------------------------------

const fillBtn = document.getElementById("fillBtn");
const status  = document.getElementById("status");

fillBtn.addEventListener("click", async () => {
  // Prevent double-clicks while waiting
  fillBtn.disabled = true;
  setStatus("", false);

  try {
    // Get the currently active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      setStatus("No active tab found.", true);
      return;
    }

    // Send the FILL_FORM message to content.js running in that tab
    const response = await chrome.tabs.sendMessage(tab.id, { action: "FILL_FORM" });

    if (response?.status === "done") {
      setStatus("Form filled successfully!");
    } else {
      setStatus("Fill attempted (no response).");
    }
  } catch (err) {
    // Common cause: content script not yet injected on chrome:// pages
    console.error("[Job Auto Fill] Error:", err);
    setStatus("Could not fill — try reloading the page.", true);
  } finally {
    fillBtn.disabled = false;
  }
});

// -----------------------------------------------
// setStatus — update the status text and style
// -----------------------------------------------
function setStatus(message, isError = false) {
  status.textContent = message;
  status.className = isError ? "error" : "";
}
