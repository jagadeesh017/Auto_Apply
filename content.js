// -----------------------------------------------
// content.js — Job Auto Fill
// Injected into every page. Listens for FILL_FORM
// message from popup.js and autofills form fields.
// -----------------------------------------------

// Predefined user profile
const PROFILE = {
  name: "Jagadeesh Uttaravilli",
  email: "test@email.com",
  phone: "9999999999",
  skills: "React, Node.js",
  experience: "Fresher"
};

// -----------------------------------------------
// getFieldHint — combine name + placeholder + label
// text for a given element into one lowercase string
// used for keyword matching.
// -----------------------------------------------
function getFieldHint(el) {
  const parts = [];

  // Attribute: name
  if (el.name) parts.push(el.name);

  // Attribute: placeholder
  if (el.placeholder) parts.push(el.placeholder);

  // Attribute: id → look for a <label for="id">
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) parts.push(label.textContent);
  }

  // Aria label
  if (el.getAttribute("aria-label")) parts.push(el.getAttribute("aria-label"));

  return parts.join(" ").toLowerCase();
}

// -----------------------------------------------
// matchProfile — decide which profile value fits
// the field based on keywords in the hint string.
// Returns the value string or null if no match.
// -----------------------------------------------
function matchProfile(hint) {
  if (/full.?name|your name|\bname\b/.test(hint)) return PROFILE.name;
  if (/e.?mail/.test(hint))                        return PROFILE.email;
  if (/phone|mobile|contact/.test(hint))           return PROFILE.phone;
  if (/skill/.test(hint))                          return PROFILE.skills;
  if (/experience/.test(hint))                     return PROFILE.experience;
  return null;
}

// -----------------------------------------------
// fillInputs — iterate all text-like inputs and
// textareas, skip already-filled ones.
// -----------------------------------------------
function fillInputs() {
  const inputs = document.querySelectorAll(
    'input:not([type="file"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'
  );

  inputs.forEach(el => {
    // Skip fields that already have a value
    if (el.value && el.value.trim() !== "") return;

    const hint = getFieldHint(el);
    const value = matchProfile(hint);

    if (value) {
      el.value = value;

      // Trigger input + change events so frameworks (if any) detect the fill
      el.dispatchEvent(new Event("input",  { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      console.log(`[Job Auto Fill] Filled "${hint.substring(0, 40)}" → "${value}"`);
    }
  });
}

// -----------------------------------------------
// fillSelects — handle <select> dropdowns.
// If the field relates to experience, try to pick
// "Fresher" (or a value that contains "fresher").
// -----------------------------------------------
function fillSelects() {
  const selects = document.querySelectorAll("select");

  selects.forEach(el => {
    // Skip already-chosen non-default options
    if (el.value && el.selectedIndex > 0) return;

    const hint = getFieldHint(el);
    if (!/experience/.test(hint)) return;

    // Look through options for one matching "fresher"
    const target = Array.from(el.options).find(
      opt => opt.text.toLowerCase().includes("fresher") ||
             opt.value.toLowerCase().includes("fresher")
    );

    if (target) {
      el.value = target.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[Job Auto Fill] Select experience → "${target.text}"`);
    }
  });
}

// -----------------------------------------------
// handleFileInputs — detect file inputs and log a
// message. Browser security prevents scripted upload.
// -----------------------------------------------
function handleFileInputs() {
  const fileInputs = document.querySelectorAll('input[type="file"]');

  fileInputs.forEach(el => {
    // Cannot programmatically set a file — browser security restriction.
    // The user must manually attach their resume / document.
    console.warn(
      "[Job Auto Fill] File input detected. " +
      "Browser security prevents auto-upload. " +
      "Please attach your resume manually."
    );
  });
}

// -----------------------------------------------
// Main listener — waits for the popup to send
// { action: "FILL_FORM" } via chrome.runtime
// -----------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "FILL_FORM") {
    console.log("[Job Auto Fill] Starting autofill…");

    fillInputs();
    fillSelects();
    handleFileInputs();

    sendResponse({ status: "done" });
  }
});
