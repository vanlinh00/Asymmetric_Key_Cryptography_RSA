#!/usr/bin/env bash
# ==============================================================================
# Script to compile and run auth-service and resource-service concurrently
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building multi-module Maven project..."
cd "$PROJECT_ROOT"
mvn clean package -DskipTests

echo "Starting auth-service on Port 8081..."
java -jar auth-service/target/auth-service-1.0.0-SNAPSHOT.jar &
AUTH_PID=$!

echo "Starting resource-service on Port 8082..."
java -jar resource-service/target/resource-service-1.0.0-SNAPSHOT.jar &
RESOURCE_PID=$!

echo "Services started: auth-service (PID $AUTH_PID), resource-service (PID $RESOURCE_PID)"
echo "Press Ctrl+C to terminate both services."

trap "kill $AUTH_PID $RESOURCE_PID 2>/dev/null || true; echo 'Services stopped.'" EXIT
wait
