// -----------------------------------------------
// content.js — Job Auto Fill
// -----------------------------------------------

const PROFILE = {
  name: "Jagadeesh Uttaravilli",
  email: "test@email.com",
  phone: "9999999999",
  skills: "React, Node.js",
  experience: "Fresher"
};

// -----------------------------------------------
// getFieldHint — scrape every possible label source
// into one lowercase string for keyword matching.
// -----------------------------------------------
function getFieldHint(el) {
  const parts = [];

  if (el.name)                          parts.push(el.name);
  if (el.placeholder)                   parts.push(el.placeholder);
  if (el.id)                            parts.push(el.id);
  if (el.getAttribute("aria-label"))    parts.push(el.getAttribute("aria-label"));
  if (el.getAttribute("title"))         parts.push(el.getAttribute("title"));
  if (el.getAttribute("data-label"))    parts.push(el.getAttribute("data-label"));

  // <label for="id">
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) parts.push(label.innerText || label.textContent);
  }

  // Closest wrapping <label>
  const wrappingLabel = el.closest("label");
  if (wrappingLabel) parts.push(wrappingLabel.innerText || wrappingLabel.textContent);

  // Sibling / nearby text: previous element text (common pattern)
  const prev = el.previousElementSibling;
  if (prev) parts.push(prev.innerText || prev.textContent || "");

  // type attribute helps too (type="email", type="tel")
  if (el.type) parts.push(el.type);

  return parts.join(" ").toLowerCase().trim();
}

// -----------------------------------------------
// matchProfile — keyword rules, ordered most-specific first.
// -----------------------------------------------
function matchProfile(hint) {
  if (/e[-_]?mail/.test(hint) || hint.includes("email") || el_type_is(hint, "email"))
                                                  return PROFILE.email;
  if (/phone|mobile|cell|contact|tel/.test(hint) || el_type_is(hint, "tel"))
                                                  return PROFILE.phone;
  if (/full[\s_-]?name|your[\s_-]?name|first[\s_-]?.*last|applicant[\s_-]?name/.test(hint))
                                                  return PROFILE.name;
  if (/\bname\b/.test(hint))                      return PROFILE.name;
  if (/skill/.test(hint))                         return PROFILE.skills;
  if (/experience|exp\b|years/.test(hint))        return PROFILE.experience;
  return null;
}

// helper: check if the hint string contains "type:<value>"
function el_type_is(hint, type) {
  return hint.includes(type);
}

// -----------------------------------------------
// setNativeValue — works for React / framework inputs
// by using the native setter so React's synthetic
// event system picks up the change.
// -----------------------------------------------
function setNativeValue(el, value) {
  const nativeSetter =
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value") ||
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");

  if (nativeSetter && nativeSetter.set) {
    nativeSetter.set.call(el, value);
  } else {
    el.value = value;
  }
}

// -----------------------------------------------
// fireEvents — dispatch all events frameworks listen to
// -----------------------------------------------
function fireEvents(el) {
  ["focus", "keydown", "keypress", "keyup", "input", "change", "blur"].forEach(type => {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  });
}

// -----------------------------------------------
// fillInputs
// -----------------------------------------------
function fillInputs() {
  const inputs = document.querySelectorAll(
    'input:not([type="file"]):not([type="submit"]):not([type="button"])' +
    ':not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="search"]), textarea'
  );

  console.log(`[Job Auto Fill] Found ${inputs.length} input/textarea fields`);

  inputs.forEach(el => {
    // Skip already-filled fields
    if (el.value && el.value.trim() !== "") {
      console.log(`[Job Auto Fill] Skipping (already filled):`, el);
      return;
    }

    const hint = getFieldHint(el);
    console.log(`[Job Auto Fill] Field hint: "${hint.substring(0, 80)}"`);

    const value = matchProfile(hint);

    if (value) {
      setNativeValue(el, value);
      fireEvents(el);
      console.log(`[Job Auto Fill] ✅ Filled → "${value}"`);
    } else {
      console.log(`[Job Auto Fill] ❌ No match for hint above`);
    }
  });
}

// -----------------------------------------------
// fillSelects
// -----------------------------------------------
function fillSelects() {
  const selects = document.querySelectorAll("select");
  console.log(`[Job Auto Fill] Found ${selects.length} select fields`);

  selects.forEach(el => {
    if (el.value && el.selectedIndex > 0) return;

    const hint = getFieldHint(el);
    console.log(`[Job Auto Fill] Select hint: "${hint.substring(0, 80)}"`);

    if (!/experience|exp\b|years|level/.test(hint)) return;

    const target = Array.from(el.options).find(
      opt => opt.text.toLowerCase().includes("fresher") ||
             opt.value.toLowerCase().includes("fresher") ||
             opt.text.toLowerCase().includes("0") ||
             opt.text.toLowerCase().includes("entry")
    );

    if (target) {
      el.value = target.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[Job Auto Fill] ✅ Select → "${target.text}"`);
    }
  });
}

// -----------------------------------------------
// handleFileInputs
// -----------------------------------------------
function handleFileInputs() {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  if (fileInputs.length > 0) {
    console.warn(
      `[Job Auto Fill] ${fileInputs.length} file input(s) detected. ` +
      "Browser security prevents auto-upload. Please attach files manually."
    );
  }
}

// -----------------------------------------------
// Message listener
// -----------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "FILL_FORM") {
    console.log("[Job Auto Fill] ▶ Starting autofill…");
    fillInputs();
    fillSelects();
    handleFileInputs();
    console.log("[Job Auto Fill] ✔ Done.");
    sendResponse({ status: "done" });
  }
});
