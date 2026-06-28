#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -d "/opt/homebrew/opt/openjdk@21/bin" ]; then
  export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
fi

mkdir -p logs

if ! command -v java >/dev/null 2>&1; then
  echo "Java is required. Install OpenJDK 21 and retry." >&2
  exit 1
fi

if ! command -v mvn >/dev/null 2>&1; then
  echo "Maven is required. Install Maven and retry." >&2
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  echo "Building admin frontend..."
  (
    cd csd-queue-admin
    if [ ! -d node_modules ]; then
      npm install
    fi
    npm run build
  ) > logs/admin-build.log 2>&1
else
  echo "npm not found; skipping admin frontend build." >&2
fi

lsof -ti :8080 | xargs kill -9 2>/dev/null || true

echo "Starting QueueFlow Java server on port 8080..."
mvn -q -DskipTests spring-boot:run > logs/java.log 2>&1 &
JAVA_PID=$!

trap 'kill $JAVA_PID 2>/dev/null || true' EXIT

echo "QueueFlow is running:"
echo "  Kiosk display: http://localhost:8080"
echo "  Admin UI:      http://localhost:8080/admin/"
echo "  REST API:      http://localhost:8080/api/v1/tickets"
echo "  Health:        http://localhost:8080/api/health"
echo "Logs: logs/java.log, logs/admin-build.log"

wait $JAVA_PID
