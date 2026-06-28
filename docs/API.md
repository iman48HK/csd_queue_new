# QueueFlow API Reference

REST API for the CSD queue management system (kiosk display, admin UI, and Oracle JDBC backend).

**Base URL:** `http://<host>:<port>` (default `http://localhost:8080`)

**Content type:** `application/json` for request and response bodies unless noted.

**Authentication:** None (internal network deployment).

**Timestamps:** Returned as ISO-8601 UTC instants (e.g. `2026-06-28T11:09:29Z`).

---

## Table of contents

1. [Conventions](#conventions)
2. [Display & kiosk](#display--kiosk)
3. [Tickets](#tickets)
4. [Admin](#admin)
5. [Public announcements (popup)](#public-announcements-popup)
6. [TV footer announcements](#tv-footer-announcements)
7. [Speech](#speech)
8. [Reference](#reference)

---

## Conventions

### HTTP status codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `204` | Success, no body |
| `400` | Bad request |
| `404` | Not found |
| `405` | Method not allowed |

### Error response

```json
{
  "detail": "Human-readable error message"
}
```

### Queue types

| Code | Alias | Counter |
|------|-------|---------|
| `A` | `1`, `waiting` | Waiting |
| `B` | `2`, `hand-in`, `handin` | Hand-In |
| `C` | `3`, `security` | Security Check |

### Ticket statuses

| Status | Description |
|--------|-------------|
| `WAITING` | Created, not yet called |
| `CALLED` | Called to counter |
| `CHECKED_IN` | Visitor checked in |
| `CHECKED_OUT` | Visitor checked out |
| `COMPLETED` | Visit completed |
| `CANCELLED` | Cancelled |

### In-progress tickets

`GET /api/v1/tickets?status=IN_PROGRESS` (and the kiosk display) include tickets that:

- Were **created today** (`CREATED_TIME` = today, Hong Kong session timezone)
- Have status **not** in `CANCELLED`, `COMPLETED`, or `CHECKED_OUT`

`ACTIVE` is accepted as an alias for `IN_PROGRESS`.

### API activity logging

All mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) under `/api/` are logged to `T_API_LOG`, except:

- `GET /api/health`, `/api/display`, `/api/config`
- `POST /api/speech/{eventId}/ack`

---

## Display & kiosk

Used by the big-screen kiosk frontend (`/`). Poll `/api/display` every 3 seconds (configurable).

### `GET /api/health`

Health check.

**Response `200`**

```json
{
  "status": "ok",
  "service": "queueflow",
  "port": 8080
}
```

---

### `GET /api/config`

Frontend runtime configuration.

**Response `200`**

```json
{
  "apiBaseUrl": "",
  "pollIntervalMs": 3000,
  "highlightDurationMs": 30000,
  "defaultLanguage": "zh-HK",
  "speechEnabled": true
}
```

| Field | Description |
|-------|-------------|
| `apiBaseUrl` | Optional override from `config/frontend/config.json` |
| `pollIntervalMs` | Display refresh interval |
| `highlightDurationMs` | How long recently updated tickets stay highlighted |
| `defaultLanguage` | Default TTS language (`zh-HK`, `zh-CN`, `en-US`) |
| `speechEnabled` | Whether speech playback is enabled |

---

### `GET /api/display`

Full display state for the kiosk (queues, announcement overlay, footer ticker, speech queue).

**Response `200`**

```json
{
  "activeCount": 5,
  "queues": {
    "handin": ["M001", "M002"],
    "security": ["W003"],
    "waiting": ["W004", "W005"]
  },
  "highlightedUntilEpochMs": {
    "W003": 1719575678000
  },
  "announcement": {
    "id": 12,
    "titleEn": "",
    "titleZh": "",
    "bodyEn": "Please remain seated.",
    "bodyZh": "請保持就座。",
    "active": true,
    "updatedAt": "2026-06-28T10:00:00Z"
  },
  "footerText": "Welcome to LWH · 歡迎光臨",
  "speechEvents": [
    {
      "id": 101,
      "ticketCode": "W003",
      "queueCode": "C",
      "languageCode": "zh-HK",
      "speechText": "W003 請到保安檢查",
      "audioUrl": "/static/audio/zh-HK.mp3",
      "segments": [
        {
          "languageCode": "zh-HK",
          "speechText": "W003 請到保安檢查",
          "audioUrl": "/static/audio/zh-HK.mp3"
        }
      ]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `activeCount` | Total in-progress tickets across all queues |
| `queues.handin` | Ticket codes for Hand-In column (queue type `B` by default) |
| `queues.security` | Ticket codes for Security column (queue type `C` by default) |
| `queues.waiting` | Ticket codes for Waiting column (queue type `A` by default) |
| `highlightedUntilEpochMs` | Map of ticket code → epoch ms when highlight expires |
| `announcement` | Active full-screen public announcement, or `null` |
| `footerText` | Scrolling TV footer text, or empty string |
| `speechEvents` | Unplayed ticket-call and public-announcement speech events |

Queue column mapping is configurable via `queueflow.display.*` properties.

---

### `POST /api/speech/{eventId}/ack`

Mark a speech event as played (kiosk display ack).

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `eventId` | long | Speech event ID from `speechEvents[].id` |

**Response `204`** — no body.

---

## Tickets

Base path: `/api/v1/tickets`

### `GET /api/v1/tickets`

List tickets.

**Query parameters**

| Name | Default | Description |
|------|---------|-------------|
| `status` | `IN_PROGRESS` | Filter: `IN_PROGRESS`, `ACTIVE`, `SERVED`, or a status code (e.g. `WAITING`, `CANCELLED`) |

**Response `200`** — array of [TicketDetail](#ticketdetail)

**Examples**

```http
GET /api/v1/tickets
GET /api/v1/tickets?status=IN_PROGRESS
GET /api/v1/tickets?status=SERVED
GET /api/v1/tickets?status=WAITING
```

---

### `POST /api/v1/tickets`

Create a ticket.

**Request body**

```json
{
  "code": null,
  "ticketTypeCode": "W",
  "queueCode": "A",
  "language": "zh-HK"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `code` | No | Explicit ticket number (e.g. `W019`). If omitted, next auto-number is used. |
| `ticketTypeCode` | Yes* | Ticket type prefix: `W` (Start Visit), `M` (Hand-In Articles), `DA` (Document Admin) |
| `queueCode` | No | Queue type (`A`/`B`/`C` or alias). Defaults to configured `DEFAULT_CREATE_QUEUE_TYPE`. |
| `language` | No | Language for queue log (`zh-HK`, `zh-CN`, `en-US`) |

\*Required when `code` is not provided.

**Response `201`** — [TicketDetail](#ticketdetail)

**Example**

```bash
curl -X POST http://localhost:8080/api/v1/tickets \
  -H 'Content-Type: application/json' \
  -d '{"ticketTypeCode":"W","queueCode":"A","language":"zh-HK"}'
```

---

### `POST /api/v1/tickets/{ticketId}/move`

Move a ticket to another queue.

**Request body**

```json
{
  "queueCode": "B",
  "language": "zh-HK"
}
```

**Response `200`** — [TicketDetail](#ticketdetail)

**Errors:** `400` if ticket is `CANCELLED` or `COMPLETED`.

---

### `POST /api/v1/tickets/{ticketId}/call`

Set ticket status to `CALLED`. Sets `callTime`.

**Response `200`** — [TicketDetail](#ticketdetail)

---

### `POST /api/v1/tickets/{ticketId}/check-in`

Set ticket status to `CHECKED_IN`. Sets `inTime` if not already set.

**Response `200`** — [TicketDetail](#ticketdetail)

---

### `POST /api/v1/tickets/{ticketId}/check-out`

Record check-out. Sets status to `CHECKED_OUT` and `outTime`.

**Response `200`** — [TicketDetail](#ticketdetail)

**Errors:** `400` if ticket cannot be checked out.

---

### `POST /api/v1/tickets/{ticketId}/complete`

Mark ticket as `COMPLETED`. Sets `outTime` if not already set.

**Response `200`** — [TicketDetail](#ticketdetail)

---

### `DELETE /api/v1/tickets/{ticketId}`

Cancel a single ticket (status → `CANCELLED`).

**Response `200`** — [TicketDetail](#ticketdetail)

---

## Admin

Base path: `/api/v1`

### `GET /api/v1/institutions`

List institutions (from `T_INS_LOCATION`).

**Response `200`** — array of [Institution](#institution)

---

### `GET /api/v1/api-logs`

Recent API call log entries (last 100).

**Response `200`** — array of [ApiLog](#apilog)

---

### `GET /api/v1/queue-logs`

Recent queue activity log entries (last 100).

**Response `200`** — array of [QueueLog](#queuelog)

---

### `POST /api/v1/tickets/clear`

Cancel all **in-progress** tickets for a queue type (today's tickets only).

**Request body**

```json
{
  "queueType": "1"
}
```

| `queueType` value | Clears |
|-------------------|--------|
| `1`, `A`, `waiting` | Waiting queue (`A`) |
| `2`, `B`, `hand-in` | Hand-In queue (`B`) |
| `3`, `C`, `security` | Security queue (`C`) |
| `4`, `ALL`, `all` | All in-progress tickets |

**Response `200`**

```json
{
  "cleared": 3
}
```

Each cancelled ticket receives a `CANCELLED` entry in `T_QUEUE_LOG` with remark `bulk-clear:<queue>`.

**Example**

```bash
curl -X POST http://localhost:8080/api/v1/tickets/clear \
  -H 'Content-Type: application/json' \
  -d '{"queueType":"3"}'
```

---

### `POST /api/v1/tickets/purge`

**Destructive.** Deletes **all** rows from `T_QUEUE` and `T_QUEUE_LOG` (not scoped to today or status).

**Request body:** `{}` (empty object)

**Response `200`**

```json
{
  "cleared": 42
}
```

Use with caution. Prefer `/tickets/clear` for normal operations.

---

## Public announcements (popup)

Base path: `/api/v1/announcements`

Full-screen overlay on the kiosk. Remains visible until cleared by admin.

### `GET /api/v1/announcements/popup`

Get the latest public announcement (most recently saved, including inactive — used by admin for editing).

**Response `200`** — [Announcement](#announcement) or `null`

---

### `POST /api/v1/announcements/popup`

Create and activate a public announcement.

**Request body**

```json
{
  "titleEn": "",
  "titleZh": "",
  "bodyEn": "Fire drill in progress. Please follow staff instructions.",
  "bodyZh": "正在進行消防演習，請遵從職員指示。",
  "active": true,
  "speak": true,
  "language": "zh-HK"
}
```

| Field | Description |
|-------|-------------|
| `bodyEn` / `bodyZh` | Announcement text shown on the overlay |
| `active` | Default `true` |
| `speak` | If `true`, queue speech on kiosk speakers |
| `language` | TTS language when `speak` is true (`zh-HK`, `zh-CN`, `en-US`, `all`) |

**Response `201`** — [Announcement](#announcement)

---

### `PUT /api/v1/announcements/popup/{announcementId}`

Update an existing announcement.

**Request body**

```json
{
  "titleEn": "",
  "titleZh": "",
  "bodyEn": "Updated message",
  "bodyZh": "更新訊息",
  "active": true
}
```

**Response `200`** — [Announcement](#announcement)

---

### `DELETE /api/v1/announcements/popup`

Stop / clear the active public announcement. Kiosk returns to queue view.

**Response `200`**

```json
{
  "cleared": 1
}
```

**Alias:** `DELETE /api/v1/announcements/popup/active`

---

## TV footer announcements

Base path: `/api/v1/announcements/footer`

Scrolling text at the bottom of the kiosk display.

### `GET /api/v1/announcements/footer`

Get the latest footer message (for admin editing).

**Response `200`** — [FooterMessage](#footermessage) or `null`

---

### `POST /api/v1/announcements/footer`

Create or replace the active footer ticker text.

**Request body**

```json
{
  "messageText": "Welcome · 歡迎光臨",
  "sortOrder": 1,
  "active": true
}
```

| Field | Description |
|-------|-------------|
| `messageText` | Scrolling text. Use ` · ` to separate English and Chinese; if omitted, same text is used for both. |
| `sortOrder` | Optional display order |
| `active` | Default `true` |

**Response `201`** — [FooterMessage](#footermessage)

---

### `PUT /api/v1/announcements/footer`

Same as `POST` — upserts footer text.

**Response `200`** — [FooterMessage](#footermessage)

---

### `DELETE /api/v1/announcements/footer`

Deactivate / clear footer messages.

**Response `200`**

```json
{
  "cleared": 1
}
```

---

## Speech

Base path: `/api/v1/speech`

Text-to-speech preview and acknowledgement for ticket calls.

### `POST /api/v1/speech`

Build speech preview for a ticket call.

**Request body**

```json
{
  "ticketCode": "W019",
  "queueCode": "C",
  "language": "zh-HK"
}
```

**Response `200`**

```json
{
  "ticketCode": "W019",
  "queueCode": "C",
  "language": "zh-HK",
  "speechText": "W019 請到保安檢查",
  "audioUrl": "/static/audio/zh-HK.mp3"
}
```

---

### `GET /api/v1/speech/text`

Query-string variant of speech preview.

**Query parameters**

| Name | Required | Description |
|------|----------|-------------|
| `ticketCode` | Yes | Ticket number |
| `queueCode` | Yes | Queue type (`A`, `B`, `C`) |
| `language` | No | Defaults to configured speech language |

**Example**

```http
GET /api/v1/speech/text?ticketCode=W019&queueCode=C&language=zh-HK
```

**Response `200`** — [SpeechPreview](#speechpreview)

---

### `POST /api/v1/speech/{logId}/ack`

Acknowledge a speech log entry as played.

**Response `200`**

```json
{
  "acknowledged": true
}
```

---

## Reference

### TicketDetail

```json
{
  "id": 47,
  "code": "W019",
  "queueType": "A",
  "status": "WAITING",
  "ticketTypeCode": "W",
  "createdAt": "2026-06-28T11:09:29Z",
  "callTime": null,
  "inTime": null,
  "outTime": null,
  "lastUpdateTime": "2026-06-28T11:09:29Z"
}
```

### Announcement

```json
{
  "id": 12,
  "titleEn": "",
  "titleZh": "",
  "bodyEn": "Message in English",
  "bodyZh": "中文訊息",
  "active": true,
  "updatedAt": "2026-06-28T10:00:00Z"
}
```

### FooterMessage

```json
{
  "id": 5,
  "messageEn": "Welcome",
  "messageTc": "歡迎光臨",
  "active": true
}
```

### Institution

```json
{
  "id": "LWH",
  "name": "Lai Chi Kok Reception",
  "active": true
}
```

### ApiLog

```json
{
  "id": 1001,
  "apiName": "POST /api/v1/tickets/clear",
  "requestTime": "2026-06-28T11:10:00Z",
  "resultCode": "200",
  "requestJson": "{\"queueType\":\"3\"}",
  "responseJson": "{\"cleared\":1}"
}
```

### QueueLog

```json
{
  "id": 500,
  "ticketCode": "W019",
  "queueType": "A",
  "eventType": "CANCELLED",
  "eventTime": "2026-06-28T11:10:00Z",
  "remarks": "bulk-clear:A"
}
```

### ClearedCount

```json
{
  "cleared": 3
}
```

### SpeechPreview

```json
{
  "ticketCode": "W019",
  "queueCode": "C",
  "language": "zh-HK",
  "speechText": "W019 請到保安檢查",
  "audioUrl": "/static/audio/zh-HK.mp3"
}
```

---

## Configuration

Runtime settings in `config/application.properties` (gitignored; copy from template):

| Property | Env override | Default | Description |
|----------|--------------|---------|-------------|
| `server.port` | `SERVER_PORT` | `8080` | HTTP port |
| `spring.datasource.url` | `ORACLE_JDBC_URL` | — | Oracle JDBC URL |
| `spring.datasource.username` | `ORACLE_USERNAME` | — | DB user |
| `spring.datasource.password` | `ORACLE_PASSWORD` | — | DB password |
| `queueflow.ins-code` | `INS_CODE` | `LWH` | Institution code |
| `queueflow.default-create-queue-type` | `DEFAULT_CREATE_QUEUE_TYPE` | `C` | Default queue for new tickets |
| `queueflow.display.poll-interval-ms` | `DISPLAY_POLL_INTERVAL_MS` | `3000` | Kiosk poll interval |
| `queueflow.ticket.highlight-duration-ms` | `TICKET_HIGHLIGHT_DURATION_MS` | `30000` | Highlight duration |
| `queueflow.speech.default-language` | `SPEECH_DEFAULT_LANGUAGE` | `zh-HK` | Default TTS language |
| `queueflow.display.handin-queue-type` | `DISPLAY_HANDIN_QUEUE_TYPE` | `B` | Hand-In column queue |
| `queueflow.display.security-queue-type` | `DISPLAY_SECURITY_QUEUE_TYPE` | `C` | Security column queue |
| `queueflow.display.waiting-queue-type` | `DISPLAY_WAITING_QUEUE_TYPE` | `A` | Waiting column queue |

Additional frontend overrides: `config/frontend/config.json`

---

## Static applications

| URL | Description |
|-----|-------------|
| `/` | Kiosk big-screen display |
| `/admin/` | Admin React UI |

---

## Quick start

```bash
./start-server.sh
```

| Service | URL |
|---------|-----|
| Kiosk | http://localhost:8080 |
| Admin | http://localhost:8080/admin/ |
| Health | http://localhost:8080/api/health |
| Display state | http://localhost:8080/api/display |
