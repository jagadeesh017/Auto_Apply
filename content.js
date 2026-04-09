// ===================================================================
// Job Auto Fill — content.js  (Production Grade v3)
// Handles: standard HTML, React/Vue/Angular, Shadow DOM,
//          dynamic/AJAX forms, complex label structures.
// ===================================================================

// Guard: if script is somehow injected twice, skip re-declaration.
if (window.__jobAutoFillLoaded) {
  // Already loaded — re-register listener only so new clicks still work.
  chrome.runtime.onMessage.addListener(handleMessage);
} else {
  window.__jobAutoFillLoaded = true;
  init();
}

function init() {

// ── Profile ──────────────────────────────────────────────────────────
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
  summary:         "Fresher with strong skills in React and Node.js, eager to contribute.",
};

// ── Attribute-based matching (highest confidence — no label text needed) ──
// Maps HTML standard values directly to profile fields.
const AUTOCOMPLETE_MAP = {
  "name":           PROFILE.fullName,
  "given-name":     PROFILE.firstName,
  "family-name":    PROFILE.lastName,
  "email":          PROFILE.email,
  "tel":            PROFILE.phone,
  "tel-national":   PROFILE.phone,
  "url":            PROFILE.website,
  "organization":   "",
  "street-address": "",
  "address-line1":  "",
  "city":           PROFILE.city,
  "country":        PROFILE.country,
  "country-name":   PROFILE.country,
};

function matchByAttribute(el) {
  const type = (el.type || "").toLowerCase();
  const ac   = (el.getAttribute("autocomplete") || "").toLowerCase().trim();

  // type="email" or type="tel" → guaranteed match
  if (type === "email")  return PROFILE.email;
  if (type === "tel")    return PROFILE.phone;

  // autocomplete attribute (very reliable when present)
  if (ac && AUTOCOMPLETE_MAP.hasOwnProperty(ac)) return AUTOCOMPLETE_MAP[ac];

  return null;
}

// ── Text-based matching rules (label / placeholder / name / id text) ──
const RULES = [
  { re: /e[\s_\-.]*mail/,                                                val: PROFILE.email      },
  { re: /phone|mobile|cell(?:ular)?|tel(?:ephone)?|contact[\s_-]?(no|num(?:ber)?)/,
                                                                         val: PROFILE.phone      },
  { re: /first[\s_\-.]*(name)?|given[\s_\-.]?name|\bfname\b/,           val: PROFILE.firstName  },
  { re: /last[\s_\-.]*(name)?|family[\s_\-.]?name|sur[\s_\-.]?name|\blname\b/,
                                                                         val: PROFILE.lastName   },
  { re: /full[\s_\-.]?name|your[\s_\-.]?name|applicant|candidate/,      val: PROFILE.fullName   },
  { re: /\bname\b/,                                                      val: PROFILE.fullName   },
  { re: /skill|technolog|tech[\s_\-.]?stack|expertise|proficienc/,       val: PROFILE.skills     },
  { re: /experience|exp[\s_\-.]*(years?|level)?|years[\s_\-.]?of/,      val: PROFILE.experience },
  { re: /linkedin/,                                                      val: PROFILE.linkedin   },
  { re: /website|portfolio|blog|github|\burl\b/,                         val: PROFILE.website    },
  { re: /summary|cover[\s_\-.]?letter|objective|about[\s_\-.]?(me|yourself)|intro/,
                                                                         val: PROFILE.summary    },
  { re: /\bcity\b|\blocati/,                                             val: PROFILE.city       },
  { re: /country/,                                                       val: PROFILE.country    },
];

function matchByHint(hint) {
  for (const rule of RULES) {
    if (rule.re.test(hint)) return rule.val;
  }
  return null;
}

// ── Hint Extraction ──────────────────────────────────────────────────
// Reads every possible label source into a single lowercase string.
function getHint(el) {
  const parts = [];
  const add = v => { if (v && String(v).trim()) parts.push(String(v).trim()); };

  // Direct attributes
  add(el.name);
  add(el.id);
  add(el.className);
  add(el.placeholder);
  add(el.getAttribute("autocomplete"));
  add(el.getAttribute("aria-label"));
  add(el.getAttribute("title"));

  // Data attributes
  for (const attr of ["data-label","data-field","data-placeholder","data-name","data-key","data-testid","data-qa","data-cy"]) {
    add(el.getAttribute(attr));
  }

  // Framework model attributes
  for (const attr of ["formcontrolname","ng-model","v-model","x-model","wire:model","name"]) {
    add(el.getAttribute(attr));
  }

  // aria-labelledby → resolve referenced element text
  const labelledBy = el.getAttribute("aria-labelledby") || "";
  for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
    try { add(document.getElementById(id)?.innerText); } catch (_) {}
  }

  // aria-describedby
  const describedBy = el.getAttribute("aria-describedby") || "";
  for (const id of describedBy.split(/\s+/).filter(Boolean)) {
    try { add(document.getElementById(id)?.innerText); } catch (_) {}
  }

  // <label for="id">
  if (el.id) {
    try {
      add(document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.innerText);
    } catch (_) {}
  }

  // Closest wrapping <label>
  add(el.closest("label")?.innerText);

  // Fieldset > legend
  add(el.closest("fieldset")?.querySelector("legend")?.innerText);

  // Walk previous siblings (up to 4) for label-like text
  let sib = el.previousElementSibling;
  for (let i = 0; i < 4 && sib; i++) {
    const tag = (sib.tagName || "").toLowerCase();
    if (["label","span","div","p","strong","b","h1","h2","h3","h4","h5","h6","dt","li","td","th"].includes(tag)) {
      // Only take text if the sibling itself has no inputs (not another field)
      if (!sib.querySelector("input,textarea,select")) {
        add(sib.innerText || sib.textContent);
        break;
      }
    }
    sib = sib.previousElementSibling;
  }

  // Walk up the DOM tree looking for a nearby label container (up to 5 levels)
  let node = el.parentElement;
  for (let depth = 0; depth < 5 && node; depth++) {
    // If this container holds only one input, its text is likely the label
    const inputsInContainer = node.querySelectorAll("input,textarea,select").length;
    if (inputsInContainer === 1) {
      const text = (node.innerText || node.textContent || "")
        .replace(el.value || "", "")
        .trim()
        .substring(0, 150);
      add(text);
      break;
    }
    node = node.parentElement;
  }

  return parts.join(" ").toLowerCase();
}

// ── Resolve final value for a field ─────────────────────────────────
function resolveValue(el) {
  // 1. Attribute-based (most reliable — no label parsing needed)
  const byAttr = matchByAttribute(el);
  if (byAttr !== null) return byAttr;

  // 2. Text/hint-based
  const hint = getHint(el);
  console.log(`[Job Auto Fill] HINT: "${hint.substring(0, 120)}"`);
  return matchByHint(hint);
}

// ── Native value setter (bypasses React/Vue/Angular state) ──────────
function setNativeValue(el, value) {
  try {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) { setter.call(el, value); return; }
  } catch (_) {}
  el.value = value;
}

// ── Event chain (covers vanilla, React, Vue, Angular, Alpine) ───────
function fireEvents(el) {
  const events = [
    new Event("focus",        { bubbles: true }),
    new InputEvent("beforeinput", { bubbles: true, data: el.value, inputType: "insertText" }),
    new KeyboardEvent("keydown",  { bubbles: true, key: "a", code: "KeyA", charCode: 97, keyCode: 65 }),
    new KeyboardEvent("keypress", { bubbles: true, key: "a", code: "KeyA", charCode: 97, keyCode: 65 }),
    new KeyboardEvent("keyup",    { bubbles: true, key: "a", code: "KeyA", charCode: 97, keyCode: 65 }),
    new InputEvent("input",   { bubbles: true, data: el.value, inputType: "insertText" }),
    new Event("change",       { bubbles: true }),
    new Event("blur",         { bubbles: true }),
  ];
  events.forEach(e => { try { el.dispatchEvent(e); } catch (_) {} });
}

// ── Visibility check ─────────────────────────────────────────────────
function isVisible(el) {
  try {
    // Elements inside shadow root may have null offsetParent — allow them
    if (el.offsetParent === null && getComputedStyle(el).position !== "fixed" && !el.getRootNode().host) {
      return false;
    }
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && parseFloat(s.opacity || "1") > 0;
  } catch (_) {
    return true;
  }
}

// ── Collect inputs — includes shadow DOM ────────────────────────────
const INPUT_SEL = [
  'input:not([type="file"]):not([type="submit"]):not([type="button"])',
  ':not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="reset"]):not([type="image"])',
  ", textarea",
].join("");

function collectInputs(root) {
  const list = [];
  try { list.push(...root.querySelectorAll(INPUT_SEL)); } catch (_) {}
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

// ── Fill text inputs / textareas ─────────────────────────────────────
function fillInputs(root = document) {
  const inputs = collectInputs(root);
  console.log(`[Job Auto Fill] Inputs found: ${inputs.length}`);
  let filled = 0;

  inputs.forEach((el, i) => {
    if (!isVisible(el) || el.readOnly || el.disabled) return;
    if (el.value && el.value.trim() !== "") {
      console.log(`[Job Auto Fill] [${i}] SKIP (already filled): ${el.name || el.id || el.type}`);
      return;
    }

    const value = resolveValue(el);

    if (value === null || value === undefined) {
      console.log(`[Job Auto Fill] [${i}] NO MATCH — ${el.name || el.id || el.type || "?"}`);
      return;
    }
    if (value === "") {
      // Profile field intentionally blank (city, website etc.) — skip
      return;
    }

    setNativeValue(el, value);
    fireEvents(el);
    filled++;
    console.log(`[Job Auto Fill] [${i}] ✅ FILLED: ${el.name || el.id || el.type || "?"} → "${value}"`);
  });

  return filled;
}

// ── Fill select dropdowns ────────────────────────────────────────────
function fillSelects(root = document) {
  const selects = collectSelects(root);
  console.log(`[Job Auto Fill] Selects found: ${selects.length}`);
  let filled = 0;

  selects.forEach(el => {
    if (!isVisible(el) || el.disabled) return;
    if (el.selectedIndex > 0 && el.value) return;

    const value = resolveValue(el);
    if (!value) return;

    const lcVal = value.toLowerCase();
    const option = Array.from(el.options).find(opt => {
      const t = opt.text.toLowerCase().trim();
      const v = opt.value.toLowerCase().trim();
      return (
        t.includes(lcVal) || v.includes(lcVal) ||
        (lcVal === "fresher" && (
          t.includes("entry") || t.includes("fresh") ||
          t === "0" || t.startsWith("0") || t.includes("< 1") || t.includes("less than")
        ))
      );
    });

    if (option) {
      el.value = option.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      filled++;
      console.log(`[Job Auto Fill] ✅ SELECT: ${el.name || el.id} → "${option.text}"`);
    }
  });

  return filled;
}

// ── File inputs — log warning only ───────────────────────────────────
function reportFileInputs(root = document) {
  const count = root.querySelectorAll('input[type="file"]').length;
  if (count > 0) {
    console.warn(`[Job Auto Fill] ⚠ ${count} file input(s) — attach resume manually.`);
  }
  return count;
}

// ── MutationObserver — re-fill dynamically added form sections ───────
let mutationTimer;
const domObserver = new MutationObserver(mutations => {
  const hasNewFields = mutations.some(m =>
    [...m.addedNodes].some(n =>
      n.nodeType === Node.ELEMENT_NODE &&
      (n.matches?.("input,textarea,select,form") || n.querySelector?.("input,textarea,select"))
    )
  );
  if (!hasNewFields) return;
  clearTimeout(mutationTimer);
  mutationTimer = setTimeout(() => {
    console.log("[Job Auto Fill] 🔄 Dynamic fields detected — re-filling…");
    fillInputs();
    fillSelects();
  }, 700);
});

// ── Message handler ──────────────────────────────────────────────────
function handleMessage(message, _sender, sendResponse) {
  if (message.action !== "FILL_FORM") return;

  console.log("[Job Auto Fill] ▶ Autofill started");

  const inputsFilled  = fillInputs();
  const selectsFilled = fillSelects();
  const fileCount     = reportFileInputs();

  try { domObserver.observe(document.body, { childList: true, subtree: true }); } catch (_) {}

  const result = { status: "done", inputsFilled, selectsFilled, fileCount };
  console.log("[Job Auto Fill] ✔ Result:", result);
  sendResponse(result);
}

chrome.runtime.onMessage.addListener(handleMessage);

} // end init()
