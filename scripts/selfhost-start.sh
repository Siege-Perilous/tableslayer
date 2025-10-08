#!/bin/bash
set -e

echo "==================================="
echo "Starting Table Slayer"
echo "==================================="
echo ""

# Detect docker-compose variant
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   For Arch Linux: sudo pacman -S docker-compose"
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env exists
if [ ! -f apps/web/.env ]; then
    echo "❌ apps/web/.env file not found"
    echo "   Run './scripts/selfhost-setup.sh' first to set up your environment"
    exit 1
fi

# Validate required environment variables
echo "Validating environment configuration..."

source apps/web/.env

MISSING_VARS=()

# Check required variables
if [ -z "$TURSO_APP_DB_URL" ]; then MISSING_VARS+=("TURSO_APP_DB_URL"); fi
if [ -z "$TURSO_APP_DB_AUTH_TOKEN" ]; then MISSING_VARS+=("TURSO_APP_DB_AUTH_TOKEN"); fi
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then MISSING_VARS+=("CLOUDFLARE_ACCOUNT_ID"); fi
if [ -z "$CLOUDFLARE_R2_ACCESS_KEY" ]; then MISSING_VARS+=("CLOUDFLARE_R2_ACCESS_KEY"); fi
if [ -z "$CLOUDFLARE_R2_SECRET_KEY" ]; then MISSING_VARS+=("CLOUDFLARE_R2_SECRET_KEY"); fi
if [ -z "$CLOUDFLARE_R2_BUCKET_NAME" ]; then MISSING_VARS+=("CLOUDFLARE_R2_BUCKET_NAME"); fi
if [ -z "$CLOUDFLARE_R2_BUCKET_URL" ]; then MISSING_VARS+=("CLOUDFLARE_R2_BUCKET_URL"); fi
if [ -z "$PUBLIC_PARTYKIT_HOST" ]; then MISSING_VARS+=("PUBLIC_PARTYKIT_HOST"); fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please configure these in your apps/web/.env file"
    exit 1
fi

echo "✅ Environment validated"
echo ""

# Start Docker Compose
echo "Starting Docker containers..."
$DOCKER_COMPOSE -f docker-compose.selfhost.yml up -d

echo ""
echo "==================================="
echo "✅ Table Slayer is running!"
echo "==================================="
echo ""
echo "Access your instance at: http://localhost:3000"
echo ""
echo "To view logs, run:"
echo "  $DOCKER_COMPOSE -f docker-compose.selfhost.yml logs -f"
echo ""
echo "To stop the server, run:"
echo "  ./scripts/selfhost-stop.sh"
echo ""
