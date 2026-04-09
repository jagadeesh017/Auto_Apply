'use strict';
// ===================================================================
// popup.js — Job Auto Fill
// ===================================================================

const fillBtn    = document.getElementById("fillBtn");
const statusBox  = document.getElementById("statusBox");
const statsRow   = document.getElementById("statsRow");
const statInputs = document.getElementById("statInputs");
const statSelects= document.getElementById("statSelects");
const fileWarn   = document.getElementById("fileWarn");

fillBtn.addEventListener("click", async () => {
  fillBtn.disabled = true;
  showStatus("Filling form…", "info");
  hideStats();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      showStatus("Could not detect the active tab.", "error");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: "FILL_FORM" });

    if (response?.status === "done") {
      const { inputsFilled = 0, selectsFilled = 0, fileCount = 0 } = response;
      const total = inputsFilled + selectsFilled;

      if (total === 0) {
        showStatus("No matching fields found on this page.", "info");
      } else {
        showStatus(`Successfully filled ${total} field${total > 1 ? "s" : ""}!`, "success");
        showStats(inputsFilled, selectsFilled);
      }

      if (fileCount > 0) {
        fileWarn.style.display = "block";
        fileWarn.textContent =
          `⚠ ${fileCount} file input${fileCount > 1 ? "s" : ""} found — please attach your resume manually.`;
      }
    } else {
      showStatus("Fill attempted — check the browser console for details.", "info");
    }

  } catch (err) {
    console.error("[Job Auto Fill]", err);
    showStatus(
      "Failed to fill. Try reloading the page, then click Auto Fill again.",
      "error"
    );
  } finally {
    fillBtn.disabled = false;
  }
});

// ── Helpers ──────────────────────────────────────────────────────────
function showStatus(msg, type) {
  statusBox.textContent  = msg;
  statusBox.className    = type;       // "success" | "error" | "info"
  statusBox.style.display = "block";
}

function showStats(inputs, selects) {
  statInputs.textContent  = inputs;
  statSelects.textContent = selects;
  statsRow.style.display  = "grid";
}

function hideStats() {
  statsRow.style.display  = "none";
  fileWarn.style.display  = "none";
}

