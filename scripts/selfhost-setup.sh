#!/bin/bash
set -e

echo "==================================="
echo "Table Slayer Self-Hosting Setup"
echo "==================================="
echo ""

# Check for required tools
echo "Checking for required tools..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

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

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    echo "   Visit: https://pnpm.io/installation"
    exit 1
fi

echo "✅ All required tools are installed"
echo ""

# Check for .env file
if [ ! -f apps/web/.env ]; then
    echo "Creating apps/web/.env file from apps/web/.env-example..."
    cp apps/web/.env-example apps/web/.env
    echo "✅ Created apps/web/.env file"
    echo ""
    echo "⚠️  IMPORTANT: You must now configure your apps/web/.env file with:"
    echo ""
    echo "   Required services:"
    echo "   - TURSO_URL and TURSO_AUTH_TOKEN (Database)"
    echo "   - CLOUDFLARE_R2_* credentials (Storage)"
    echo "   - PUBLIC_PARTYKIT_HOST (Real-time collaboration)"
    echo ""
    echo "   Optional services (leave empty to disable):"
    echo "   - RESEND_TOKEN (Email)"
    echo "   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (OAuth)"
    echo "   - STRIPE_* credentials (Payments)"
    echo ""
    read -p "Press Enter after you've configured your apps/web/.env file..."
else
    echo "✅ apps/web/.env file already exists"
    echo ""
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
    echo "Please configure these in your apps/web/.env file and run this script again."
    exit 1
fi

echo "✅ Required environment variables are configured"
echo ""

# Install dependencies
echo "Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Run database migrations
echo "Running database migrations..."
cd apps/web
pnpm run push
cd ../..
echo "✅ Database schema initialized"
echo ""

# Build Docker image
echo "Building Docker image..."
$DOCKER_COMPOSE -f docker-compose.selfhost.yml build
echo "✅ Docker image built"
echo ""

echo "==================================="
echo "✅ Setup complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Run './scripts/selfhost-start.sh' to start Table Slayer"
echo "2. Visit http://localhost:3000 in your browser"
echo "3. Run './scripts/selfhost-stop.sh' to stop the server"
echo ""
