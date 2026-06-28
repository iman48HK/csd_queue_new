import { counterLabelFromQueueType } from "@/api/queueApi";

export const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

const HK_TIME_OPTIONS = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: HONG_KONG_TIME_ZONE,
};

export function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-GB", HK_TIME_OPTIONS);
}

export function formatWaitMinutes(createdAt, servedAt) {
  if (!createdAt || !servedAt) return "-";
  const mins = Math.max(
    0,
    Math.round((new Date(servedAt).getTime() - new Date(createdAt).getTime()) / 60000),
  );
  return `${mins} min`;
}

export function queueTypeBadgeClass(queueType) {
  switch (queueType) {
    case "B":
      return "bg-emerald-100 text-emerald-700";
    case "A":
      return "bg-amber-100 text-amber-700";
    case "C":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export function mapServedTicket(row) {
  const servedAt = row.outTime || row.lastUpdateTime;
  return {
    id: row.id,
    code: row.code,
    counter: counterLabelFromQueueType(row.queueType),
    queueType: row.queueType,
    ticketType: row.ticketTypeCode || "-",
    servedAt,
    waitTime: formatWaitMinutes(row.createdAt, servedAt),
    status: row.status,
  };
}

export function mapQueueLogToActivity(log) {
  const counter = counterLabelFromQueueType(log.queueType);
  const action = `${log.eventType}${log.ticketCode ? `: ${log.ticketCode}` : ""} (${counter})${
    log.remarks ? ` — ${log.remarks}` : ""
  }`;
  return {
    id: log.id,
    time: formatTime(log.eventTime),
    category: log.eventType === "CREATED" ? "Queue" : "Queue",
    action,
  };
}

function parseRequestJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function truncateText(text, max = 80) {
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function describeTicketApi(method, path, body) {
  const ticketMatch = path.match(/\/tickets\/(\d+)/);
  const ticketId = ticketMatch ? ticketMatch[1] : null;
  if (path.endsWith("/move")) {
    return `Move ticket ${ticketId} to queue ${body.queueType || body.targetQueueType || body.queueCode || "?"}`;
  }
  if (path.endsWith("/check-in")) return `Check in ticket ${ticketId}`;
  if (path.endsWith("/check-out")) return `Check out ticket ${ticketId}`;
  if (path.endsWith("/complete")) return `Complete ticket ${ticketId}`;
  if (path.endsWith("/call")) return `Call ticket ${ticketId}`;
  if (method === "DELETE" && ticketId) return `Cancel ticket ${ticketId}`;
  if (path.endsWith("/clear")) return `Clear queue: ${body.queueType || "ALL"}`;
  if (path.endsWith("/purge")) return "Purge all tickets";
  if (method === "POST" && /\/tickets\/?$/.test(path)) {
    return `Create ticket (type ${body.ticketTypeCode || "?"}, queue ${body.queueCode || "?"})`;
  }
  return `${method} ${path}`;
}

export function mapApiLogToActivity(log) {
  const apiName = String(log.apiName || "");
  const hasMethodPrefix = apiName.includes(" ");
  const method = hasMethodPrefix ? apiName.split(" ")[0] : "";
  const path = hasMethodPrefix
    ? apiName.slice(apiName.indexOf(" ") + 1).split("?")[0]
    : apiName.split("?")[0];
  const body = parseRequestJson(log.requestJson);
  let category = "API";
  let action = apiName;

  if (path.includes("/announcements/footer")) {
    category = "TV";
    if (method === "DELETE") {
      action = "Clear TV footer text";
    } else {
      const text = body.messageText || body.messageEn || body.messageTc || body.messageSc || "";
      action = text ? `Set TV footer: ${truncateText(text)}` : "Set TV footer text";
    }
  } else if (path.includes("/announcements/popup")) {
    category = "Announcement";
    if (method === "DELETE") {
      action = "Clear announcement";
    } else {
      const text =
        body.bodyEn || body.bodyZh || body.messageEn || body.messageTc || body.messageSc || "";
      action = text ? `Set announcement: ${truncateText(text)}` : `${method} announcement`;
    }
  } else if (path.includes("/tickets")) {
    category = "Queue";
    action = describeTicketApi(method, path, body);
  } else if (path.includes("/speech")) {
    category = "Speech";
  }

  return {
    id: `api-${log.id}`,
    sortKey: log.requestTime ? new Date(log.requestTime).getTime() : 0,
    time: formatTime(log.requestTime),
    category,
    action,
  };
}

export function mapApiLogToAlert(log) {
  const normalized = String(log.resultCode || "").toUpperCase();
  let type = "info";
  if (normalized === "SUCCESS" || normalized === "200") {
    type = "success";
  } else if (normalized.includes("404")) {
    type = "warning";
  } else if (normalized && normalized !== "SUCCESS") {
    type = "error";
  }
  return {
    id: log.id,
    type,
    message: `${log.apiName} — ${log.resultCode || "unknown"}`,
    source: "API",
    time: formatTime(log.requestTime),
    timestamp: log.requestTime ? new Date(log.requestTime).getTime() : 0,
  };
}
