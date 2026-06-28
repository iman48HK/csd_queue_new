const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const VOICE_LANGUAGE_OPTIONS = [
  { value: "cantonese", label: "Cantonese" },
  { value: "mandarin", label: "Mandarin" },
  { value: "english", label: "English" },
  { value: "all", label: "All" },
];

export function toApiLanguage(language) {
  if (!language) return "zh-HK";
  if (language === "all") return "all";
  if (language === "cantonese") return "zh-HK";
  if (language === "mandarin") return "zh-CN";
  if (language === "english") return "en-US";
  return language;
}

export function queueTypeFromUi(value) {
  switch (value) {
    case "waiting":
    case "move-a":
      return "A";
    case "hand-in":
    case "move-b":
      return "B";
    case "security":
    case "move-c":
      return "C";
    default:
      return value?.toUpperCase?.() || "A";
  }
}

export function counterLabelFromQueueType(queueType) {
  switch (queueType) {
    case "B":
      return "Hand-In";
    case "C":
      return "Security";
    case "A":
    default:
      return "Waiting";
  }
}

export const queueApi = {
  health: () => request("/api/health"),
  listTickets: (status = "IN_PROGRESS") =>
    request(`/api/v1/tickets?status=${encodeURIComponent(status)}`),
  listServedTickets: () => request("/api/v1/tickets?status=SERVED"),
  createTicket: (payload) =>
    request("/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  moveTicket: (ticketId, payload) =>
    request(`/api/v1/tickets/${ticketId}/move`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  checkIn: (ticketId) =>
    request(`/api/v1/tickets/${ticketId}/check-in`, { method: "POST" }),
  checkOut: (ticketId) =>
    request(`/api/v1/tickets/${ticketId}/check-out`, { method: "POST" }),
  completeTicket: (ticketId) =>
    request(`/api/v1/tickets/${ticketId}/complete`, { method: "POST" }),
  callTicket: (ticketId) =>
    request(`/api/v1/tickets/${ticketId}/call`, { method: "POST" }),
  cancelTicket: (ticketId) =>
    request(`/api/v1/tickets/${ticketId}`, { method: "DELETE" }),
  clearTickets: (queueType) =>
    request("/api/v1/tickets/clear", {
      method: "POST",
      body: JSON.stringify({ queueType }),
    }),
  purgeTickets: () =>
    request("/api/v1/tickets/purge", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getPopup: () => request("/api/v1/announcements/popup"),
  createPopup: (payload) =>
    request("/api/v1/announcements/popup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  clearPopup: () =>
    request("/api/v1/announcements/popup", { method: "DELETE" }),
  getFooter: () => request("/api/v1/announcements/footer"),
  setFooter: (payload) =>
    request("/api/v1/announcements/footer", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listInstitutions: () => request("/api/v1/institutions"),
  listApiLogs: () => request("/api/v1/api-logs"),
  listQueueLogs: () => request("/api/v1/queue-logs"),
  getDisplay: () => request("/api/display"),
};
