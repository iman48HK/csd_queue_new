# QueueFlow JAR Deployment Guide

Deploy the QueueFlow Spring Boot application as a standalone JAR on a server connected to Oracle. The JAR serves the kiosk display, admin UI, REST API, and static assets from a single process.

**Related docs:** [API Reference](API.md)

---

## Overview

| Item | Value |
|------|-------|
| Artifact | `csd-queue-1.0.0.jar` |
| Group / artifact | `com.queueflow:csd-queue:1.0.0` |
| Java | **17+** required (OpenJDK **21** recommended) |
| Default port | `8080` |
| Database | Oracle via JDBC (`ojdbc11`, bundled in JAR) |
| Timezone | **Asia/Hong_Kong** (required for correct queue dates) |

### What the JAR includes

- Spring Boot embedded Tomcat
- Kiosk frontend (`/` → `static/index.html`, `app.js`, fonts, audio)
- Admin UI (`/admin/` → built React app)
- REST API (`/api/*`, `/api/v1/*`)
- Oracle JDBC driver

### What must be deployed **beside** the JAR

| Path | Purpose |
|------|---------|
| `config/application.properties` | Database credentials, port, queue/display settings |
| `config/frontend/config.json` | Optional kiosk runtime overrides |
| `logs/` | Runtime logs (created automatically by scripts) |

Configuration is loaded from `./config/application.properties` relative to the **process working directory**, not from inside the JAR.

---

## Deployment layout

Recommended directory on the target server:

```text
/opt/queueflow/
├── csd-queue-1.0.0.jar
├── config/
│   ├── application.properties      # required (from example template)
│   └── frontend/
│       └── config.json             # optional overrides
├── logs/
│   ├── java.log
│   └── java.pid                    # if using start scripts
├── start-server.sh                 # optional (build + start)
├── stop-server.sh                  # optional
└── scripts/
    └── start-daemon.py             # optional background launcher
```

The JAR can be renamed, but keep the version in deployment notes for traceability.

---

## Build the JAR

Build on a machine with **Java 17+**, **Maven 3.8+**, and **Node.js 18+** (for the admin UI).

### 1. Clone / copy the project

```bash
git clone <repository-url> queueflow
cd queueflow
```

### 2. Configure before packaging (optional)

You may pre-create `config/application.properties` on the build machine, but production secrets should be placed **only on the server**.

```bash
cp config/application.properties.example config/application.properties
# Edit config/application.properties with real Oracle settings
```

### 3. Build admin UI + JAR

**Full build (recommended):**

```bash
./start-server.sh
# Builds admin (npm), packages JAR, starts server — use only to verify build.
./stop-server.sh
```

**Build JAR only (CI / release pipeline):**

```bash
# Admin UI → embedded into src/main/resources/static/admin/
cd csd-queue-admin
npm ci
npm run build
cd ..

# Fat JAR
mvn -DskipTests package

# Output:
ls -la target/csd-queue-1.0.0.jar
```

**Maven only (skip admin rebuild):**

Use when `src/main/resources/static/admin/` is already committed or copied from a prior build:

```bash
mvn -DskipTests package
```

### 4. Copy to server

```bash
scp target/csd-queue-1.0.0.jar user@server:/opt/queueflow/
scp config/application.properties.example user@server:/opt/queueflow/config/
scp -r config/frontend user@server:/opt/queueflow/config/
```

Do **not** commit or copy production `config/application.properties` into source control.

---

## Server configuration

### `config/application.properties`

Copy the example and edit on the server:

```bash
cp config/application.properties.example config/application.properties
chmod 600 config/application.properties
```

**Minimum required settings:**

```properties
server.port=8080

spring.datasource.url=jdbc:oracle:thin:@//db-host:1521/SERVICE_NAME
spring.datasource.username=QUEUE_USER
spring.datasource.password=<secret>
spring.datasource.driver-class-name=oracle.jdbc.OracleDriver

queueflow.ins-code=LWH
```

**Full template:** `config/application.properties.example`

### Environment variable overrides

Any property can be overridden without editing the file:

| Variable | Maps to |
|----------|---------|
| `SERVER_PORT` | `server.port` |
| `ORACLE_JDBC_URL` | `spring.datasource.url` |
| `ORACLE_USERNAME` | `spring.datasource.username` |
| `ORACLE_PASSWORD` | `spring.datasource.password` |
| `INS_CODE` | `queueflow.ins-code` |
| `DISPLAY_POLL_INTERVAL_MS` | Kiosk poll interval (default `3000`) |
| `SPEECH_DEFAULT_LANGUAGE` | Default TTS language (default `zh-HK`) |
| `DISPLAY_HANDIN_QUEUE_TYPE` | Hand-In column queue (default `B`) |
| `DISPLAY_SECURITY_QUEUE_TYPE` | Security column queue (default `C`) |
| `DISPLAY_WAITING_QUEUE_TYPE` | Waiting column queue (default `A`) |

Example:

```bash
export ORACLE_JDBC_URL="jdbc:oracle:thin:@//db.example:1521/QUEUEDB"
export ORACLE_USERNAME="queue_app"
export ORACLE_PASSWORD="$(cat /run/secrets/oracle_password)"
export SERVER_PORT=8080
export INS_CODE=LWH
```

### `config/frontend/config.json` (optional)

Overrides kiosk behaviour without rebuilding the JAR:

```json
{
  "apiBaseUrl": "",
  "pollIntervalMs": 3000,
  "highlightDurationMs": 30000,
  "defaultLanguage": "zh-HK",
  "speechEnabled": true
}
```

Leave `apiBaseUrl` empty when the kiosk and API share the same host/port.

---

## Run the JAR

Always start the JAR from the deployment root so `./config/` resolves correctly.

### Foreground (testing)

```bash
cd /opt/queueflow
java -Duser.timezone=Asia/Hong_Kong -jar csd-queue-1.0.0.jar
```

### Background (project script)

```bash
cd /opt/queueflow
mkdir -p logs
python3 scripts/start-daemon.py csd-queue-1.0.0.jar logs/java.log logs/java.pid
```

The daemon script sets Hong Kong timezone and detaches the process.

### Stop

```bash
./stop-server.sh
```

Or manually:

```bash
kill "$(cat logs/java.pid)"
# or
kill $(lsof -ti :8080)
```

---

## systemd service (Linux production)

Create `/etc/systemd/system/queueflow.service`:

```ini
[Unit]
Description=QueueFlow kiosk and API server
After=network.target

[Service]
Type=simple
User=queueflow
Group=queueflow
WorkingDirectory=/opt/queueflow
ExecStart=/usr/bin/java -Duser.timezone=Asia/Hong_Kong -jar /opt/queueflow/csd-queue-1.0.0.jar
Restart=on-failure
RestartSec=10

# Optional: load secrets from environment file
EnvironmentFile=-/etc/queueflow/env

StandardOutput=append:/opt/queueflow/logs/java.log
StandardError=append:/opt/queueflow/logs/java.log

[Install]
WantedBy=multi-user.target
```

Create `/etc/queueflow/env`:

```bash
ORACLE_JDBC_URL=jdbc:oracle:thin:@//db-host:1521/SERVICE
ORACLE_USERNAME=queue_app
ORACLE_PASSWORD=change-me
SERVER_PORT=8080
INS_CODE=LWH
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable queueflow
sudo systemctl start queueflow
sudo systemctl status queueflow
```

Logs:

```bash
journalctl -u queueflow -f
tail -f /opt/queueflow/logs/java.log
```

---

## Verify deployment

### Health check

```bash
curl -s http://localhost:8080/api/health
```

Expected:

```json
{"status":"ok","service":"queueflow","port":8080}
```

### Endpoints

| URL | Purpose |
|-----|---------|
| http://\<host\>:8080/ | Kiosk big-screen display |
| http://\<host\>:8080/admin/ | Admin UI |
| http://\<host\>:8080/api/display | Display state (JSON) |
| http://\<host\>:8080/api/v1/tickets | Ticket API |

### Database connectivity

If the health endpoint responds but tickets fail, check Oracle credentials and network access from the app server to the DB listener. Review `logs/java.log` for JDBC errors such as `ORA-12541` (no listener) or `ORA-01017` (invalid credentials).

---

## Kiosk browser setup

The display is designed for **Chrome** in full-screen / kiosk mode on a machine **without internet access**. All fonts, CSS, JS, and speech assets are served locally from the JAR.

Example launch (Linux):

```bash
google-chrome --kiosk --app=http://localhost:8080/
```

Point the kiosk machine at the server host if the JAR runs on a separate host:

```bash
google-chrome --kiosk --app=http://queue-server:8080/
```

Admin operators open `http://<server>:8080/admin/` from an internal workstation.

---

## Upgrade procedure

1. **Stop** the running service:
   ```bash
   sudo systemctl stop queueflow
   # or ./stop-server.sh
   ```

2. **Back up** the current JAR and config:
   ```bash
   cp csd-queue-1.0.0.jar csd-queue-1.0.0.jar.bak
   cp config/application.properties config/application.properties.bak
   ```

3. **Deploy** the new JAR (rebuild admin UI before `mvn package` if the release includes admin changes).

4. **Start** and verify:
   ```bash
   sudo systemctl start queueflow
   curl -s http://localhost:8080/api/health
   ```

5. Hard-refresh browsers (`Cmd+Shift+R` / `Ctrl+Shift+R`) on kiosk and admin after static asset updates.

Database schema is managed separately; this application expects existing Oracle tables (`T_QUEUE`, `T_STATUS`, `T_ANNOUNCEMENT`, etc.).

---

## Build vs runtime requirements

| Phase | Java | Maven | Node/npm |
|-------|------|-------|----------|
| Build JAR + admin | Yes | Yes | Yes |
| Run JAR on server | Yes | No | No |

A production server only needs a JRE/JDK and the files listed in [Deployment layout](#deployment-layout).

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `Missing config/application.properties` / defaults used | Config not beside CWD | Start JAR from `/opt/queueflow`; ensure `config/application.properties` exists |
| Port already in use | Previous instance running | `./stop-server.sh` or `lsof -ti :8080 \| xargs kill` |
| Admin UI shows old cards | Stale static bundle | Rebuild admin (`npm run build` in `csd-queue-admin`), repackage JAR, hard-refresh browser |
| Tickets 8 hours off | Wrong timezone | Start with `-Duser.timezone=Asia/Hong_Kong` |
| `Connection refused` to Oracle | Network / URL / listener | Verify JDBC URL, firewall, Oracle service name |
| Kiosk cannot reach API | Wrong host | Set kiosk URL to server IP; keep `apiBaseUrl` empty in config.json when same origin |
| Empty queue columns | Wrong `INS_CODE` or queue mapping | Check `queueflow.ins-code` and `queueflow.display.*-queue-type` |

**Log file:** `logs/java.log`

**Spring Boot startup failure:** run foreground once to see errors on stdout:

```bash
java -Duser.timezone=Asia/Hong_Kong -jar csd-queue-1.0.0.jar
```

---

## Security notes

- Run the service as a dedicated low-privilege user (`queueflow`).
- Restrict `config/application.properties` permissions (`chmod 600`).
- Do not expose port 8080 to the public internet; use an internal network or reverse proxy on a trusted segment.
- No authentication is built into the API; physical/network access control is assumed.
- Keep Oracle credentials out of git; use `config/application.properties` or `EnvironmentFile` on the server only.

---

## Quick reference

```bash
# Build release JAR
cd csd-queue-admin && npm ci && npm run build && cd ..
mvn -DskipTests package

# Deploy
scp target/csd-queue-1.0.0.jar server:/opt/queueflow/

# Run
cd /opt/queueflow
java -Duser.timezone=Asia/Hong_Kong -jar csd-queue-1.0.0.jar

# Verify
curl http://localhost:8080/api/health
```
