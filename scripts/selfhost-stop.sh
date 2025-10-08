#!/bin/bash
set -e

echo "==================================="
echo "Stopping Table Slayer"
echo "==================================="
echo ""

# Stop Docker Compose
echo "Stopping Docker containers..."
docker-compose -f docker-compose.selfhost.yml down

echo ""
echo "✅ Table Slayer has been stopped"
echo ""
