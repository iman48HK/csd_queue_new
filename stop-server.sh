#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -f logs/java.pid ] && kill -0 "$(cat logs/java.pid)" 2>/dev/null; then
  echo "Stopping QueueFlow (PID $(cat logs/java.pid))..."
  kill "$(cat logs/java.pid)" 2>/dev/null || true
  sleep 2
  rm -f logs/java.pid
fi

if lsof -ti :8080 >/dev/null 2>&1; then
  echo "Stopping process on port 8080..."
  lsof -ti :8080 | xargs kill -9 2>/dev/null || true
fi

echo "Server stopped."
