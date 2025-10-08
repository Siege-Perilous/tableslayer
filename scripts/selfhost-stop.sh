#!/bin/bash
set -e

echo "==================================="
echo "Stopping Table Slayer"
echo "==================================="
echo ""

# Detect docker-compose variant
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# Stop Docker Compose
echo "Stopping Docker containers..."
$DOCKER_COMPOSE -f docker-compose.selfhost.yml down

echo ""
echo "✅ Table Slayer has been stopped"
echo ""
