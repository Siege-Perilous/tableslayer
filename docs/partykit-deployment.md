# PartyKit Deployment Guide

## Prerequisites

1. **PartyKit Account**: Create an account at https://partykit.io
2. **PartyKit CLI**: Already installed as a dependency
3. **GitHub Secret**: Add `PARTYKIT_TOKEN` to your GitHub repository secrets

## First-Time Setup

### 1. Login to PartyKit

```bash
cd apps/web
npx partykit login
```

This will open a browser window for authentication.

### 2. Get Your PartyKit Token

After logging in, get your auth token:

```bash
npx partykit whoami
```

### 3. Add Token to GitHub Secrets

1. Go to your GitHub repository settings
2. Navigate to Settings → Secrets and variables → Actions
3. Add a new repository secret named `PARTYKIT_TOKEN`
4. Paste your PartyKit auth token as the value

## Manual Deployment

To deploy PartyKit servers manually:

```bash
cd apps/web
npx partykit deploy --name tableslayer
```

Your servers will be available at:

- WebSocket endpoint: `wss://tableslayer.partykit.dev`
- Party-specific rooms: `wss://tableslayer.partykit.dev/parties/{party_name}/{room_id}`

## Automatic Deployment

### Production Deployment

PartyKit servers are automatically deployed when you push to the `main` branch:

- Production endpoint: `tableslayer.partykit.dev`

### PR Preview Deployments

Each pull request gets its own PartyKit deployment:

- PR #123 → `pr-123-tableslayer.partykit.dev`
- PR #456 → `pr-456-tableslayer.partykit.dev`

These are automatically:

- Created when a PR is opened
- Updated when commits are pushed
- Deleted when the PR is closed

## Environment Variables

### Development

- `PUBLIC_PARTYKIT_HOST=localhost:1999`

### Production

- `PUBLIC_PARTYKIT_HOST=tableslayer.partykit.dev`

## Monitoring

### PartyKit Dashboard

Visit https://partykit.io/dashboard to monitor:

- Active connections
- Request counts
- Error logs
- Performance metrics

### Debugging Connection Issues

1. Check browser console for WebSocket errors
2. Verify the PartyKit host is correct in your environment
3. Check PartyKit dashboard for server errors
4. Ensure party names use underscores (not camelCase)

## Rollback Procedure

If you need to rollback PartyKit changes:

1. Revert the code changes in git
2. Deploy the previous version:
   ```bash
   cd apps/web
   npx partykit deploy --name tableslayer
   ```

## Cost Management

PartyKit pricing tiers:

- **Free**: Up to 10K requests/day
- **$19/month**: Up to 1M requests/day
- **$99/month**: Up to 10M requests/day

Monitor usage in the PartyKit dashboard to ensure you stay within your tier.

## Troubleshooting

### Common Issues

1. **"Invalid party name" error**
   - Party names must use underscores or hyphens, not camelCase
   - Check `partykit.json` configuration

2. **WebSocket connection fails**
   - Verify `PUBLIC_PARTYKIT_HOST` is set correctly
   - Check that PartyKit servers are deployed
   - Ensure client is using the correct party name

3. **Y.js sync issues**
   - Check browser console for Y.js errors
   - Verify both providers (game_session and party) are connecting
   - Look for errors in PartyKit dashboard logs

### Debug Mode

To enable debug logging in production:

1. Set `localStorage.debug = 'yjs,partykit'` in browser console
2. Reload the page
3. Check console for detailed logs

## Next Steps

After deployment:

1. Test WebSocket connections in production
2. Monitor PartyKit dashboard for errors
3. Implement SQLite persistence in PartyKit servers
4. Set up monitoring alerts for connection issues
