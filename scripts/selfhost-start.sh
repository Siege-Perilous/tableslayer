#!/bin/bash
set -e

echo "==================================="
echo "Starting Table Slayer"
echo "==================================="
echo ""

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
if [ -z "$TURSO_URL" ]; then MISSING_VARS+=("TURSO_URL"); fi
if [ -z "$TURSO_AUTH_TOKEN" ]; then MISSING_VARS+=("TURSO_AUTH_TOKEN"); fi
if [ -z "$CLOUDFLARE_R2_ACCOUNT_ID" ]; then MISSING_VARS+=("CLOUDFLARE_R2_ACCOUNT_ID"); fi
if [ -z "$CLOUDFLARE_R2_ACCESS_KEY_ID" ]; then MISSING_VARS+=("CLOUDFLARE_R2_ACCESS_KEY_ID"); fi
if [ -z "$CLOUDFLARE_R2_SECRET_ACCESS_KEY" ]; then MISSING_VARS+=("CLOUDFLARE_R2_SECRET_ACCESS_KEY"); fi
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
docker-compose -f docker-compose.selfhost.yml up -d

echo ""
echo "==================================="
echo "✅ Table Slayer is running!"
echo "==================================="
echo ""
echo "Access your instance at: http://localhost:3000"
echo ""
echo "To view logs, run:"
echo "  docker-compose -f docker-compose.selfhost.yml logs -f"
echo ""
echo "To stop the server, run:"
echo "  ./scripts/selfhost-stop.sh"
echo ""
