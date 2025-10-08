# Self-hosting Table Slayer

This guide will help you self-host Table Slayer using Docker. This simplified setup assumes you're using managed services for database, storage, and real-time collaboration.

## Architecture overview

Table Slayer requires three core services:

1. **Database**: Turso (or compatible libsql server)
2. **Storage**: Cloudflare R2 (or S3-compatible storage)
3. **Real-time**: Partykit for collaborative editing

Optional services can be disabled:

- **Email** (Resend): Disable for no-email mode
- **OAuth** (Google): Disable to use email/password only
- **Payments** (Stripe): Disable to give all users lifetime access

## Prerequisites

- Docker and Docker Compose installed
- Accounts set up for required services (see below)

## Required services setup

### 1. Database - Turso

1. Sign up at [turso.tech](https://turso.tech)
2. Create a new database
3. Get your `TURSO_URL` and `TURSO_AUTH_TOKEN`

### 2. Storage - Cloudflare R2

1. Sign up at [Cloudflare](https://dash.cloudflare.com/)
2. Navigate to R2 Object Storage
3. Create a new bucket
4. Generate R2 API tokens
5. Get your:
   - `CLOUDFLARE_R2_ACCOUNT_ID`
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - `CLOUDFLARE_R2_BUCKET_NAME`
   - `CLOUDFLARE_R2_BUCKET_URL` (your bucket's public URL)

### 3. Real-time collaboration - Partykit

1. Sign up at [partykit.io](https://partykit.io)
2. Deploy the Table Slayer Partykit server:
   ```bash
   cd partykit
   npx partykit deploy
   ```
3. Get your `PUBLIC_PARTYKIT_HOST` (e.g., `your-project.partykit.dev`)

## Optional services setup

### Email - Resend (optional)

If you want email verification and password reset:

1. Sign up at [resend.com](https://resend.com)
2. Get your `RESEND_TOKEN`

If disabled:

- Users are auto-verified on signup
- Password reset is unavailable
- Party invites work via shareable links

### Google OAuth (optional)

If you want Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Get your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Stripe payments (optional)

If you want to charge for access:

1. Sign up at [Stripe](https://dashboard.stripe.com/)
2. Create products and prices
3. Get your:
   - `STRIPE_API_KEY`
   - `STRIPE_WEBHOOK_KEY`
   - `STRIPE_PRICE_ID_LIFETIME`
   - `STRIPE_PRICE_ID_MONTHLY`
   - `STRIPE_PRICE_ID_YEARLY`

If disabled, all users get lifetime access automatically.

## Installation

### Quick start (recommended)

```bash
git clone https://github.com/Siege-Perilous/tableslayer.git
cd tableslayer
./scripts/selfhost-setup.sh
./scripts/selfhost-start.sh
```

The setup script will:

1. Check for required tools (Docker, pnpm)
2. Create `.env` from `.env-example` if needed
3. Validate your configuration
4. Install dependencies and initialize the database
5. Build the Docker image

### Manual setup

If you prefer to set up manually:

#### 1. Clone the repository

```bash
git clone https://github.com/Siege-Perilous/tableslayer.git
cd tableslayer
```

#### 2. Configure environment

```bash
cp .env-example .env
```

Edit `.env` and fill in your service credentials.

#### 3. Initialize database

```bash
# Install dependencies
pnpm install

# Generate and push the database schema
cd apps/web
pnpm run push
cd ../..
```

#### 4. Build and run

```bash
# Build and start the container
docker-compose -f docker-compose.selfhost.yml up -d

# Check logs
docker-compose -f docker-compose.selfhost.yml logs -f
```

Table Slayer will be available at `http://localhost:3000`

## Configuration options

### Change the port

Edit `docker-compose.selfhost.yml`:

```yaml
ports:
  - '8080:3000' # Change 8080 to your desired port
```

### Enable/disable optional features

Set these in `.env`:

```bash
# Disable email (leave empty)
RESEND_TOKEN=

# Disable Google OAuth (leave empty)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Disable Stripe (leave empty for free lifetime access)
STRIPE_API_KEY=
```

## Health check

Visit `/healthcheck` to see your instance status:

```bash
curl http://localhost:3000/healthcheck
```

Response includes:

- `isStripeEnabled`: Payment system status
- `isGoogleOAuthEnabled`: Google sign-in status
- `isEmailEnabled`: Email service status
- Other system information

## Managing your instance

### Starting Table Slayer

```bash
./scripts/selfhost-start.sh
```

### Stopping Table Slayer

```bash
./scripts/selfhost-stop.sh
```

### Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.selfhost.yml up -d --build
```

## Troubleshooting

### Container won't start

Check logs:

```bash
docker-compose -f docker-compose.selfhost.yml logs
```

### Database connection issues

Verify your Turso credentials:

```bash
# Test connection
turso db shell <your-database-name>
```

### Storage issues

Verify R2 bucket is public and credentials are correct.

### Partykit connection issues

Check your Partykit deployment is running:

```bash
curl https://your-project.partykit.dev
```

## Support

- **Issues**: https://github.com/Siege-Perilous/tableslayer/issues
- **Discord**: https://discord.gg/BaNqz5yncd
- **Email**: dave@tableslayer.com
