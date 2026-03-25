/**
 * Demo queue data — mirrors the reference site structure.
 * Prefix M → blue styling, W → orange. "active" highlights Security Check card.
 */
const QUEUE = {
  handIn: ["M002", "M003"],
  security: [
    { code: "W001", active: false },
    { code: "M001", active: true },
  ],
  waiting: [
    "M004",
    "M005",
    "W002",
    "W003",
    "W004",
    "DA001",
    "DA002",
  ],
};

function ticketClass(code) {
  return code.startsWith("W") ? "ticket__code--w" : "ticket__code--m";
}

function ticketKindClass(code) {
  return code.startsWith("W") ? "ticket--w" : "ticket--m";
}

function ticketChipKindClass(code) {
  return code.startsWith("W") ? "ticket-chip--w" : "ticket-chip--m";
}

function ticketChipCodeClass(code) {
  return code.startsWith("W") ? "ticket-chip__code--w" : "ticket-chip__code--m";
}

function splitTicketCode(code) {
  const match = String(code).match(/^([A-Za-z]+)(.*)$/);
  if (!match) return { prefix: "", number: String(code) };
  return { prefix: match[1], number: match[2] };
}

function renderTickets(containerId, items, options = {}) {
  const panel = document.getElementById(containerId);
  if (!panel) return;
  const codes = items.map((item) =>
    typeof item === "string" ? item : item.code,
  );
  panel.innerHTML = codes
    .map((code) => {
      const kindCls = ticketChipKindClass(code);
      const codeCls = ticketChipCodeClass(code);
      const { prefix, number } = splitTicketCode(code);
      return `<span class="ticket-chip ${kindCls}"><span class="ticket-chip__code ${codeCls}"><span class="ticket-chip__prefix">${prefix}</span>${number}</span></span>`;
    })
    .join("");
}

function totalActiveTickets() {
  return (
    QUEUE.handIn.length + QUEUE.security.length + QUEUE.waiting.length
  );
}

function updateCounts() {
  const n = totalActiveTickets();
  const label = document.getElementById("active-count-label");
  if (label) {
    label.textContent = `${n} ticket${n === 1 ? "" : "s"} active`;
  }
  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  setText("count-handin", QUEUE.handIn.length);
  setText("count-security", QUEUE.security.length);
  setText("count-waiting", QUEUE.waiting.length);
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function tickClock() {
  const now = new Date();
  const el = document.getElementById("clock");
  const dateEl = document.getElementById("header-date");
  if (el) {
    el.textContent = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (dateEl) {
    dateEl.textContent = formatDate(now);
  }
}

function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const stored = localStorage.getItem("queueflow-theme");
  if (stored === "dark" || stored === "light") {
    root.dataset.theme = stored;
  }
  btn?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("queueflow-theme", next);
  });
}

let ticketListScrollLoopId = 0;
let ticketListScrollReady = false;

/**
 * When a column list is taller than its visible area, scroll it automatically
 * in a continuous loop (top → bottom, then jump to top and repeat).
 */
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

function init() {
  renderTickets("tickets-handin", QUEUE.handIn);
  renderTickets("tickets-security", QUEUE.security);
  renderTickets("tickets-waiting", QUEUE.waiting);
  updateCounts();
  tickClock();
  setInterval(tickClock, 1000);
  initTheme();
  /* Wait for layout/fonts so scrollHeight vs clientHeight is correct */
  requestAnimationFrame(() => {
    requestAnimationFrame(initAutoScrollTicketLists);
  });
}

document.addEventListener("DOMContentLoaded", init);
