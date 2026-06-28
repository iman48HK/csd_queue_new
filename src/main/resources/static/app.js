const PANEL_IDS = {
  handin: "tickets-handin",
  security: "tickets-security",
  waiting: "tickets-waiting",
};

let runtimeConfig = {
  apiBaseUrl: "",
  pollIntervalMs: 3000,
  highlightDurationMs: 30000,
  defaultLanguage: "zh-HK",
  speechEnabled: true,
};

let pollTimer = null;
let clockTimer = null;
let speechQueue = [];
let speechBusy = false;
let spokenEventIds = new Set();
let ticketListScrollReady = false;
let ticketListScrollLoopId = 0;

const footerTicker = {
  track: null,
  wrap: null,
  lastText: null,
  segmentWidth: 0,
  ready: false,
  speedPxPerSec: 72,
  gapPx: 64,
};

function apiUrl(path) {
  const base = runtimeConfig.apiBaseUrl || "";
  return `${base}${path}`;
}

function ticketChipKindClass(code) {
  return String(code).startsWith("W") ? "ticket-chip--w" : "ticket-chip--m";
}

function ticketChipCodeClass(code) {
  return String(code).startsWith("W")
    ? "ticket-chip__code--w"
    : "ticket-chip__code--m";
}

function splitTicketCode(code) {
  const match = String(code).match(/^([A-Za-z]+)(.*)$/);
  if (!match) return { prefix: "", number: String(code) };
  return { prefix: match[1], number: match[2] };
}

function renderTickets(containerId, codes, highlightedUntilEpochMs) {
  const panel = document.getElementById(containerId);
  if (!panel) return;

  const now = Date.now();
  panel.innerHTML = codes
    .map((code) => {
      const kindCls = ticketChipKindClass(code);
      const codeCls = ticketChipCodeClass(code);
      const { prefix, number } = splitTicketCode(code);
      const highlightUntil = highlightedUntilEpochMs[code] || 0;
      const highlightCls =
        highlightUntil > now ? " ticket-chip__code--highlight" : "";
      return `<span class="ticket-chip ${kindCls}"><span class="ticket-chip__code ${codeCls}${highlightCls}" data-code="${code}"><span class="ticket-chip__prefix">${prefix}</span>${number}</span></span>`;
    })
    .join("");
}

function updateCounts(activeCount) {
  const label = document.getElementById("active-count-label");
  if (label) {
    label.textContent = `${activeCount} ticket${activeCount === 1 ? "" : "s"} in progress`;
  }
}

function footerScrollSpeedPxPerSec() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  return reduceMotion.matches
    ? footerTicker.speedPxPerSec * 0.4
    : footerTicker.speedPxPerSec;
}

function measureFooterSegment() {
  const chunks = footerTicker.track?.querySelectorAll(".ticker__text");
  if (!chunks || chunks.length === 0) {
    footerTicker.segmentWidth = 0;
    return;
  }
  if (chunks.length === 1) {
    footerTicker.segmentWidth = chunks[0].getBoundingClientRect().width;
    return;
  }
  const first = chunks[0].getBoundingClientRect();
  const second = chunks[1].getBoundingClientRect();
  footerTicker.segmentWidth = Math.max(1, second.left - first.left);
}

function applyFooterMarquee() {
  const track = footerTicker.track;
  const segment = footerTicker.segmentWidth;
  if (!track || !segment || !footerTicker.lastText) return;

  const duration = segment / footerScrollSpeedPxPerSec();
  track.style.setProperty("--ticker-shift", `${segment}px`);
  track.style.animation = "none";
  void track.offsetWidth;
  track.style.animation = `footer-marquee ${duration}s linear infinite`;
}

function rebuildFooterTrack(text) {
  const track = document.getElementById("ticker");
  const wrap = document.querySelector(".ticker-wrap");
  if (!track || !wrap) return;

  footerTicker.track = track;
  footerTicker.wrap = wrap;
  track.innerHTML = "";

  const viewportWidth = wrap.clientWidth || window.innerWidth;
  let index = 0;
  let totalWidth = 0;

  while (totalWidth < viewportWidth * 2 || index < 2) {
    const span = document.createElement("span");
    span.className = "ticker__text";
    span.textContent = text;
    if (index > 0) span.setAttribute("aria-hidden", "true");
    track.appendChild(span);
    totalWidth = track.scrollWidth;
    index += 1;
    if (index > 12) break;
  }

  measureFooterSegment();
  applyFooterMarquee();
}

function initFooterTicker() {
  if (footerTicker.ready) return;

  const wrap = document.querySelector(".ticker-wrap");
  if (!wrap) return;

  footerTicker.wrap = wrap;
  footerTicker.ready = true;

  if (footerTicker.lastText) {
    wrap.classList.remove("hidden");
    rebuildFooterTrack(footerTicker.lastText);
  }

  const resizeObserver = new ResizeObserver(() => {
    if (!footerTicker.lastText) return;
    rebuildFooterTrack(footerTicker.lastText);
  });
  resizeObserver.observe(wrap);
}

function updateFooter(text) {
  const value = (text || "").trim();
  if (value === footerTicker.lastText) return;

  footerTicker.lastText = value;
  const wrap = document.querySelector(".ticker-wrap");
  const track = document.getElementById("ticker");

  if (!value) {
    footerTicker.segmentWidth = 0;
    if (track) {
      track.innerHTML = "";
      track.style.animation = "";
      track.style.removeProperty("--ticker-shift");
    }
    if (wrap) wrap.classList.add("hidden");
    return;
  }

  if (wrap) wrap.classList.remove("hidden");
  if (footerTicker.ready) {
    rebuildFooterTrack(value);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const value = text || "";
  el.textContent = value;
  el.classList.toggle("hidden", !value.trim());
}

function announcementMessage(announcement) {
  const bodyEn = (announcement.bodyEn || "").trim();
  const bodyZh = (announcement.bodyZh || "").trim();
  const titleEn = (announcement.titleEn || "").trim();
  const titleZh = (announcement.titleZh || "").trim();
  const primaryEn = bodyEn || titleEn;
  const primaryZh = bodyZh || titleZh;

  if (primaryZh && primaryEn && primaryZh !== primaryEn) {
    return `${primaryZh}\n${primaryEn}`;
  }
  return primaryZh || primaryEn || "";
}

function updateAnnouncement(announcement) {
  const overlay = document.getElementById("announcement-overlay");
  if (!overlay) return;

  if (!announcement || !announcement.active) {
    overlay.classList.add("hidden");
    setText("announcement-message", "");
    return;
  }

  setText("announcement-message", announcementMessage(announcement));
  overlay.classList.remove("hidden");
}

function voiceLanguagePreferences(languageCode) {
  const lang = (languageCode || runtimeConfig.defaultLanguage || "zh-HK").toLowerCase();
  if (lang.startsWith("en")) {
    return ["en-us", "en-gb", "en-au", "en"];
  }
  if (lang === "zh-cn" || lang.includes("hans")) {
    return ["zh-cn", "zh-hans-cn", "zh-hans", "cmn-cn", "zh-cn"];
  }
  return ["zh-hk", "yue-hant-hk", "yue-hk", "zh-tw", "zh-hk"];
}

function pickVoice(languageCode) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferences = voiceLanguagePreferences(languageCode);
  for (const pref of preferences) {
    const exact = voices.find((voice) => voice.lang.toLowerCase() === pref);
    if (exact) return exact;
  }
  for (const pref of preferences) {
    const prefix = pref.split("-")[0];
    const partial = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(prefix),
    );
    if (partial) return partial;
  }
  return null;
}

function speechSegmentsForEvent(event) {
  if (Array.isArray(event.segments) && event.segments.length) {
    return event.segments;
  }
  if (!event.speechText) return [];
  return [
    {
      languageCode: event.languageCode,
      speechText: event.speechText,
      audioUrl: event.audioUrl,
    },
  ];
}

function enqueueSpeechEvents(events) {
  if (!runtimeConfig.speechEnabled || !Array.isArray(events)) return;

  for (const event of events) {
    if (spokenEventIds.has(event.id)) continue;
    speechQueue.push(event);
  }
  processSpeechQueue();
}

function speakWithBrowser(segment, done) {
  const utterance = new SpeechSynthesisUtterance(segment.speechText);
  const voice = pickVoice(segment.languageCode);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = segment.languageCode || runtimeConfig.defaultLanguage;
  }
  utterance.onend = done;
  utterance.onerror = done;
  window.speechSynthesis.speak(utterance);
}

function playSpeechSegment(segment) {
  return new Promise((resolve) => {
    const finish = () => resolve();
    const speakFallback = () => {
      if (runtimeConfig.speechEnabled && segment.speechText && window.speechSynthesis) {
        speakWithBrowser(segment, finish);
        return;
      }
      finish();
    };

    if (segment.audioUrl) {
      const audio = new Audio(segment.audioUrl);
      audio.onended = finish;
      audio.onerror = speakFallback;
      audio.play().catch(speakFallback);
      return;
    }

    speakFallback();
  });
}

async function playSpeechSegments(segments) {
  for (const segment of segments) {
    await playSpeechSegment(segment);
  }
}

function playSpeechEvent(event) {
  const segments = speechSegmentsForEvent(event);
  if (!segments.length) return Promise.resolve();
  return playSpeechSegments(segments);
}

function processSpeechQueue() {
  if (speechBusy || !speechQueue.length) return;

  const event = speechQueue.shift();
  speechBusy = true;
  spokenEventIds.add(event.id);

  playSpeechEvent(event)
    .then(() =>
      fetch(apiUrl(`/api/speech/${event.id}/ack`), { method: "POST" }).catch(
        () => {},
      ),
    )
    .finally(() => {
      speechBusy = false;
      processSpeechQueue();
    });
}

async function loadConfig() {
  const response = await fetch(apiUrl("/api/config"));
  if (!response.ok) {
    throw new Error(`Config request failed: ${response.status}`);
  }
  const config = await response.json();
  runtimeConfig = {
    apiBaseUrl: config.apiBaseUrl || "",
    pollIntervalMs: config.pollIntervalMs || 3000,
    highlightDurationMs: config.highlightDurationMs || 30000,
    defaultLanguage: config.defaultLanguage || "zh-HK",
    speechEnabled: config.speechEnabled !== false,
  };
}

async function refreshDisplay() {
  let state;
  try {
    const response = await fetch(apiUrl("/api/display"));
    if (!response.ok) {
      throw new Error(`Display request failed: ${response.status}`);
    }
    state = await response.json();
  } catch (error) {
    renderTickets(PANEL_IDS.handin, [], {});
    renderTickets(PANEL_IDS.security, [], {});
    renderTickets(PANEL_IDS.waiting, [], {});
    updateCounts(0);
    throw error;
  }

  renderTickets(
    PANEL_IDS.handin,
    state.queues.handin || [],
    state.highlightedUntilEpochMs || {},
  );
  renderTickets(
    PANEL_IDS.security,
    state.queues.security || [],
    state.highlightedUntilEpochMs || {},
  );
  renderTickets(
    PANEL_IDS.waiting,
    state.queues.waiting || [],
    state.highlightedUntilEpochMs || {},
  );

  updateCounts(state.activeCount || 0);
  updateFooter(state.footerText || "");
  updateAnnouncement(state.announcement);
  enqueueSpeechEvents(state.speechEvents || []);
}

function tickClock() {
  // Reserved for optional clock/header widgets.
}

function initAutoScrollTicketLists() {
  if (ticketListScrollReady) return;
  const lists = [...document.querySelectorAll(".ticket-list-scroll")];
  if (!lists.length) return;
  ticketListScrollReady = true;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const baseSpeed = 18;
  const wheelPauseMs = 2000;

  const items = lists.map((el) => ({
    el,
    hover: false,
    wheelUntil: 0,
  }));

  function speedPxPerSec() {
    return reduceMotion.matches ? baseSpeed * 0.45 : baseSpeed;
  }

  items.forEach((s) => {
    s.el.addEventListener("mouseenter", () => {
      s.hover = true;
    });
    s.el.addEventListener("mouseleave", () => {
      s.hover = false;
    });
    s.el.addEventListener(
      "wheel",
      () => {
        s.wheelUntil = performance.now() + wheelPauseMs;
      },
      { passive: true },
    );
    s.el.addEventListener(
      "touchstart",
      () => {
        s.hover = true;
      },
      { passive: true },
    );
    s.el.addEventListener("touchend", () => {
      s.hover = false;
    });

    const ro = new ResizeObserver(() => {
      const el = s.el;
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (el.scrollTop > maxScroll) el.scrollTop = maxScroll;
    });
    ro.observe(s.el);
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.12);
    last = now;
    const spd = speedPxPerSec();

    items.forEach((s) => {
      if (s.hover || now < s.wheelUntil) return;

      const { el } = s;
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);

      if (maxScroll < 2) {
        el.scrollTop = 0;
        return;
      }

      let st = el.scrollTop + spd * dt;
      if (st >= maxScroll - 0.75) {
        el.scrollTop = 0;
      } else {
        el.scrollTop = st;
      }
    });

    ticketListScrollLoopId = requestAnimationFrame(frame);
  }
  ticketListScrollLoopId = requestAnimationFrame(frame);
}

async function init() {
  document.documentElement.dataset.theme = "dark";

  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  await loadConfig();
  await refreshDisplay();

  pollTimer = window.setInterval(() => {
    refreshDisplay().catch((error) => {
      console.error("Display refresh failed", error);
    });
  }, runtimeConfig.pollIntervalMs);

  clockTimer = window.setInterval(tickClock, 1000);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initAutoScrollTicketLists();
      initFooterTicker();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error("QueueFlow init failed", error);
  });
});
