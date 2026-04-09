// ===================================================================
// Job Auto Fill — content.js  (Production Grade)
// Handles: standard HTML, React/Vue/Angular, Shadow DOM,
//          dynamic/AJAX forms, complex label structures.
// ===================================================================

// Guard: prevent errors if the script is somehow injected more than once.
if (window.__jobAutoFillLoaded) {
  // Already running — nothing to do.
} else {
window.__jobAutoFillLoaded = true;

// ── Profile ─────────────────────────────────────────────────────────
const PROFILE = {
  firstName:       "Jagadeesh",
  lastName:        "Uttaravilli",
  fullName:        "Jagadeesh Uttaravilli",
  email:           "test@email.com",
  phone:           "9999999999",
  skills:          "React, Node.js",
  experience:      "Fresher",
  experienceYears: "0",
  linkedin:        "https://linkedin.com/in/jagadeesh017",
  website:         "",
  city:            "",
  country:         "India",
  summary:         "Fresher with strong skills in React and Node.js, eager to contribute to a dynamic team.",
};

// ── Matching Rules ───────────────────────────────────────────────────
// Ordered most-specific → least-specific so the first match wins.
const RULES = [
  // Email (also type="email" lands here via hint)
  { re: /e[\s_\-.]*mail/,                                              val: PROFILE.email },

  // Phone
  { re: /phone|mobile|cell(?:ular)?|tel(?:ephone)?|contact[\s_-]?(no|num(?:ber)?)/,
                                                                       val: PROFILE.phone },

  // First name (before generic "name")
  { re: /first[\s_\-.]*(name)?|given[\s_\-.]?name|\bfname\b/,         val: PROFILE.firstName },

  // Last / family name
  { re: /last[\s_\-.]*(name)?|family[\s_\-.]?name|sur[\s_\-.]?name|\blname\b/,
                                                                       val: PROFILE.lastName },

  // Full name
  { re: /full[\s_\-.]?name|your[\s_\-.]?name|applicant[\s_\-.]?name|candidate[\s_\-.]?name/,
                                                                       val: PROFILE.fullName },

  // Generic name fallback
  { re: /\bname\b/,                                                    val: PROFILE.fullName },

  // Skills / technologies
  { re: /skill|technolog|tech[\s_\-.]?stack|expertise|proficienc|competenc/,
                                                                       val: PROFILE.skills },

  // Experience
  { re: /experience|exp(?:erience)?[\s_\-.]*(years?|level)?|years[\s_\-.]?of[\s_\-.]?exp/,
                                                                       val: PROFILE.experience },

  // LinkedIn
  { re: /linkedin/,                                                    val: PROFILE.linkedin },

  // Website / portfolio
  { re: /website|portfolio|blog|github|url/,                           val: PROFILE.website },

  // Summary / cover letter
  { re: /summary|cover[\s_\-.]?letter|objective|about[\s_\-.]?(me|yourself)|intro|bio/,
                                                                       val: PROFILE.summary },

  // Location
  { re: /\bcity\b|\blocati/,                                           val: PROFILE.city },
  { re: /country/,                                                     val: PROFILE.country },
];

// ── Hint Extraction ──────────────────────────────────────────────────
/**
 * Collect every label-like signal for an element into one lowercase string.
 * Sources checked (in order): name, id, placeholder, type, autocomplete,
 * aria-label, aria-labelledby, title, data-* attrs, framework model attrs,
 * <label for="">, wrapping <label>, fieldset legend, previous sibling text,
 * parent element text.
 */
function getHint(el) {
  const parts = [];
  const add = v => { if (v && String(v).trim()) parts.push(String(v).trim()); };

  // Standard attributes
  add(el.name);
  add(el.id);
  add(el.placeholder);
  add(el.type);
  add(el.getAttribute("autocomplete"));
  add(el.getAttribute("aria-label"));
  add(el.getAttribute("title"));

  // Data attributes (many custom forms use these)
  ["data-label","data-field","data-placeholder","data-name","data-key","data-testid"]
    .forEach(attr => add(el.getAttribute(attr)));

  // Framework binding attributes
  ["formcontrolname","ng-model","[(ngmodel)]","v-model","x-model","wire:model"]
    .forEach(attr => add(el.getAttribute(attr)));

  // aria-labelledby → fetch each referenced element's text
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    labelledBy.split(/\s+/).forEach(id => {
      try {
        const ref = document.getElementById(id);
        if (ref) add(ref.innerText || ref.textContent);
      } catch (_) {}
    });
  }

  // <label for="id">
  if (el.id) {
    try {
      const forLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (forLabel) add(forLabel.innerText || forLabel.textContent);
    } catch (_) {}
  }

  // Wrapping <label>
  const wrapLabel = el.closest("label");
  if (wrapLabel) add(wrapLabel.innerText || wrapLabel.textContent);

  // Fieldset legend
  const legend = el.closest("fieldset")?.querySelector("legend");
  if (legend) add(legend.innerText || legend.textContent);

  // Previous sibling — walk up to 3 steps looking for text nodes
  let prev = el.previousElementSibling;
  for (let i = 0; i < 3 && prev; i++) {
    const tag = prev.tagName?.toLowerCase() || "";
    if (["label","span","div","p","strong","b","h1","h2","h3","h4","h5","h6","li"].includes(tag)) {
      add(prev.innerText || prev.textContent);
      break;
    }
    prev = prev.previousElementSibling;
  }

  // Parent element text (trim to 120 chars to avoid noise)
  const parent = el.parentElement;
  if (parent) {
    const pText = (parent.innerText || parent.textContent || "")
      .replace(el.value || "", "")
      .substring(0, 120);
    add(pText);
  }

  return parts.join(" ").toLowerCase();
}

// ── Profile Matcher ──────────────────────────────────────────────────
function matchProfile(hint) {
  for (const rule of RULES) {
    if (rule.re.test(hint)) return rule.val;
  }
  return null;
}

// ── Native Value Setter ──────────────────────────────────────────────
/**
 * Setting el.value = "x" directly bypasses React/Vue/Angular's internal
 * state tracking. Using the native prototype setter forces frameworks to
 * recognise the change after we dispatch events.
 */
function setNativeValue(el, value) {
  try {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) {
      descriptor.set.call(el, value);
      return;
    }
  } catch (_) {}
  // Fallback
  el.value = value;
}

// ── Event Dispatcher ─────────────────────────────────────────────────
/**
 * Fire a comprehensive chain of events so every framework detects the fill.
 */
function fireEvents(el) {
  [
    new Event("focus",    { bubbles: true }),
    new InputEvent("beforeinput", { bubbles: true, data: el.value }),
    new KeyboardEvent("keydown",  { bubbles: true, key: "a", code: "KeyA", charCode: 97 }),
    new KeyboardEvent("keypress", { bubbles: true, key: "a", code: "KeyA", charCode: 97 }),
    new KeyboardEvent("keyup",    { bubbles: true, key: "a", code: "KeyA", charCode: 97 }),
    new InputEvent("input",  { bubbles: true, data: el.value }),
    new Event("change",  { bubbles: true }),
    new Event("blur",    { bubbles: true }),
  ].forEach(e => { try { el.dispatchEvent(e); } catch (_) {} });
}

// ── Visibility Guard ─────────────────────────────────────────────────
function isVisible(el) {
  try {
    if (!el.offsetParent && getComputedStyle(el).position !== "fixed") return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && parseFloat(s.opacity) > 0;
  } catch (_) {
    return true; // shadow-root elements may throw; assume visible
  }
}

// ── Shadow DOM + iframe Traversal ────────────────────────────────────
function collectInputs(root) {
  const list = [];
  const SEL = [
    'input:not([type="file"]):not([type="submit"]):not([type="button"])',
    ':not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="reset"])',
    ', textarea',
  ].join("");

  try { list.push(...root.querySelectorAll(SEL)); } catch (_) {}

  try {
    root.querySelectorAll("*").forEach(el => {
      if (el.shadowRoot) list.push(...collectInputs(el.shadowRoot));
    });
  } catch (_) {}

  return list;
}

function collectSelects(root) {
  const list = [];
  try { list.push(...root.querySelectorAll("select")); } catch (_) {}
  try {
    root.querySelectorAll("*").forEach(el => {
      if (el.shadowRoot) list.push(...collectSelects(el.shadowRoot));
    });
  } catch (_) {}
  return list;
}

// ── Fill Inputs ──────────────────────────────────────────────────────
function fillInputs(root = document) {
  const inputs = collectInputs(root);
  console.log(`[Job Auto Fill] Inputs found: ${inputs.length}`);
  let filled = 0;

  inputs.forEach(el => {
    if (!isVisible(el)) return;
    if (el.readOnly || el.disabled) return;
    if (el.value && el.value.trim() !== "") return; // don't overwrite

    const hint = getHint(el);
    console.debug(`[Job Auto Fill] hint → "${hint.substring(0, 100)}"`);

    const value = matchProfile(hint);
    if (!value && value !== 0) return;

    setNativeValue(el, value);
    fireEvents(el);
    filled++;
    console.log(`[Job Auto Fill] ✅ ${el.name || el.id || el.type || "?"} → "${value}"`);
  });

  return filled;
}

// ── Fill Selects ─────────────────────────────────────────────────────
function fillSelects(root = document) {
  const selects = collectSelects(root);
  let filled = 0;

  selects.forEach(el => {
    if (!isVisible(el) || el.disabled) return;
    if (el.selectedIndex > 0 && el.value) return;

    const hint = getHint(el);
    const value = matchProfile(hint);
    if (!value) return;

    const lcVal = value.toLowerCase();

    const option = Array.from(el.options).find(opt => {
      const t = opt.text.toLowerCase();
      const v = opt.value.toLowerCase();
      return (
        t.includes(lcVal) ||
        v.includes(lcVal) ||
        lcVal.includes(t.replace(/\s+/g, "").trim()) ||
        // Fresher aliases
        (lcVal === "fresher" && (
          t.includes("entry") || t.includes("fresh") ||
          t === "0" || t.includes("0-1") || t.includes("< 1") || t.includes("less than 1")
        ))
      );
    });

    if (option) {
      el.value = option.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      filled++;
      console.log(`[Job Auto Fill] ✅ <select> ${el.name || el.id} → "${option.text}"`);
    }
  });

  return filled;
}

// ── File Inputs ──────────────────────────────────────────────────────
function reportFileInputs(root = document) {
  const count = root.querySelectorAll('input[type="file"]').length;
  if (count > 0) {
    console.warn(
      `[Job Auto Fill] ⚠ ${count} file input(s) detected. ` +
      "Browser security prevents scripted upload — please attach files manually."
    );
  }
  return count;
}

// ── MutationObserver ─────────────────────────────────────────────────
// Watches for forms that load dynamically (SPA navigation, modal dialogs,
// multi-step wizards that render sections on demand) and re-runs fill.
let mutationTimer;
const domObserver = new MutationObserver(mutations => {
  const hasNewFields = mutations.some(m =>
    [...m.addedNodes].some(node =>
      node.nodeType === Node.ELEMENT_NODE &&
      (node.matches?.("input,textarea,select,form") ||
       node.querySelector?.("input,textarea,select"))
    )
  );
  if (!hasNewFields) return;

  clearTimeout(mutationTimer);
  mutationTimer = setTimeout(() => {
    console.log("[Job Auto Fill] 🔄 New fields detected — refilling…");
    fillInputs();
    fillSelects();
  }, 700);
});

// ── Message Listener ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "FILL_FORM") return;

  console.log("[Job Auto Fill] ▶ Autofill started");

  const inputsFilled  = fillInputs();
  const selectsFilled = fillSelects();
  const fileCount     = reportFileInputs();

  // Begin watching for dynamic form sections
  try {
    domObserver.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}

  const result = { status: "done", inputsFilled, selectsFilled, fileCount };
  console.log("[Job Auto Fill] ✔ Result:", result);
  sendResponse(result);
});

} // end guard: window.__jobAutoFillLoaded
