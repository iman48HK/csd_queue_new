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

if command -v npm >/dev/null 2>&1 && [ -d csd-queue-admin ]; then
  echo "Building admin frontend..."
  (
    cd csd-queue-admin
    if [ ! -d node_modules ]; then
      npm install
    fi
    npm run build
  ) > logs/admin-build.log 2>&1
fi

if [ -f logs/java.pid ] && kill -0 "$(cat logs/java.pid)" 2>/dev/null; then
  echo "Stopping existing server (PID $(cat logs/java.pid))..."
  kill "$(cat logs/java.pid)" 2>/dev/null || true
  sleep 2
fi

lsof -ti :8080 | xargs kill -9 2>/dev/null || true

echo "Building Java package..."
mvn -q -DskipTests package >> logs/java.log 2>&1

JAR="target/csd-queue-1.0.0.jar"
if [ ! -f "$JAR" ]; then
  echo "Missing $JAR after build." >&2
  exit 1
fi

echo "Starting QueueFlow in background..."
python3 scripts/start-daemon.py "$JAR" logs/java.log logs/java.pid

for i in $(seq 1 45); do
  if [ -f logs/java.pid ] && kill -0 "$(cat logs/java.pid)" 2>/dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null | grep -q 200; then
      echo "QueueFlow is running (PID $(cat logs/java.pid)):"
      echo "  Kiosk display: http://localhost:8080"
      echo "  Admin UI:      http://localhost:8080/admin/"
      echo "  Health:        http://localhost:8080/api/health"
      exit 0
    fi
  fi
  sleep 2
done

echo "Server failed to start. Check logs/java.log" >&2
exit 1
