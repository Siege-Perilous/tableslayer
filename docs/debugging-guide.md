# Debugging Guide for Table Slayer

This guide explains the debugging utilities available in Table Slayer and how to use them in both development and production environments.

## Table of Contents

1. [Overview](#overview)
2. [Debug Functions](#debug-functions)
3. [Production Debugging](#production-debugging)
4. [Common Debug Scenarios](#common-debug-scenarios)
5. [Performance Monitoring](#performance-monitoring)

## Overview

Table Slayer includes several debug logging utilities that can be enabled selectively without affecting production performance. Debug logs are designed to have **zero performance impact** when not enabled.

## Debug Functions

### Development-Only Logs

These functions only work in development mode (when `dev = true`):

#### `devLog(prefix?: string, ...args)`

General purpose debug logging:

```typescript
import { devLog } from '$lib/utils/debug';

// With system prefix
devLog('yjs', 'Connected to PartyKit', { room: 'game-123' });
// Output: [yjs] Connected to PartyKit { room: 'game-123' }

// Without prefix
devLog('User clicked button');
// Output: User clicked button
```

**Prefix Convention:**

- `yjs` - Y.js synchronization events
- `save` - Database save operations
- `scene` - Scene switching and management
- `markers` - Marker operations
- `query` - TanStack Query operations
- `fog` - Fog of war updates
- `annotation` - Annotation layer updates

#### `devWarn(prefix?: string, ...args)`

Warning messages in development:

```typescript
import { devWarn } from '$lib/utils/debug';

devWarn('scene', 'Navigation loop detected', { attempts: 3 });
// Output: [scene] Navigation loop detected { attempts: 3 }
```

#### `devError(prefix?: string, ...args)`

Error messages in development:

```typescript
import { devError } from '$lib/utils/debug';

devError('save', 'Failed to save marker', error);
// Output: [save] Failed to save marker Error: ...
```

### Production-Safe Logs

These functions can be enabled in production via query parameters:

#### `prodLog(category: string, message: string, data?: any)`

**NEW**: Production-safe debug logs that can be enabled via URL query parameters.

**Enable in production:**

- `?debug=all` - Enable ALL production debug logs
- `?debug=scene` - Enable only scene-related logs
- `?debug=query` - Enable only query-related logs
- `?debug=yjs` - Enable only Y.js logs

**Usage:**

```typescript
import { prodLog } from '$lib/utils/debug';

// Query lifecycle
prodLog('query', 'Creating timestampsQuery', {
  gameSessionId: gameSession.id,
  partyId: party.id,
  timestamp: Date.now()
});

// Scene switching
prodLog('scene', 'Scene switch', {
  from: previousSceneId,
  to: currentSceneId,
  timestamp: Date.now()
});

// Auto-navigation detection
prodLog('scene', 'AUTO-NAVIGATION from order mismatch', {
  from: selectedSceneNumber,
  to: currentSceneInYjs.order,
  targetPath,
  timestamp: Date.now()
});
```

**Categories:**

- `scene` - Scene switching, navigation, and order changes
- `query` - TanStack Query lifecycle and refetches
- `yjs` - Y.js connection and sync status
- `save` - Database save operations
- `fog` - Fog of war updates
- `marker` - Marker operations

#### `timingLog(category: string, message: string)`

Special timing logs for fog of war round-trip performance:

**Enable in production:**

- `?debug=fogtiming` - Enable fog timing logs

**Usage:**

```typescript
import { timingLog } from '$lib/utils/debug';

timingLog('FOG-RT', `fog_${updateId} - 1. Fog update triggered in editor`);
timingLog('FOG-RT', `fog_${updateId} - 2. Starting RLE encoding`);
timingLog('FOG-RT', `fog_${updateId} - 3. RLE encoding complete (${bytes.length} bytes)`);
```

**Example output:**

```
[FOG-RT] fog_1757940658914 - 1. Fog update triggered in editor
[FOG-RT] fog_1757940658914 - 2. Starting fog processing after 500ms debounce
[FOG-RT] fog_1757940658914 - 3. Starting RLE encoding
[FOG-RT] fog_1757940658914 - 4. RLE encoding complete (7889 bytes)
[FOG-RT] fog_1757940658914 - 5. Starting database save
[FOG-RT] fog_1757940658914 - 6. Database save complete
[FOG-RT] fog_1757940658914 - 7. Setting mask version 1757940661272
[FOG-RT] fog_1757940658914 - 8. Broadcasting Y.js update
[FOG-RT] fog_1757940658914 - 9. Y.js broadcast complete
[FOG-RT] fog_1757940661272 - 10. Playfield detected mask version change
[FOG-RT] fog_1757940661272 - 11. Fetching fog mask from API
[FOG-RT] fog_1757940661272 - 12. Fog mask API response received
[FOG-RT] fog_1757940661272 - 13. Applying 7889 bytes to fog layer
[FOG-RT] fog_1757940661272 - 14. Fog mask applied successfully
[FOG-RT] fog_1757940661272 - COMPLETE: Full round-trip completed
```

## Production Debugging

### Enabling Debug Logs in Production

Debug logs are enabled by adding query parameters to the URL. This allows debugging production issues without redeploying or affecting other users.

**Examples:**

```bash
# Enable all production logs
https://tableslayer.com/my-party/session/1?debug=all

# Enable only scene-related logs
https://tableslayer.com/my-party/session/1?debug=scene

# Enable only query logs
https://tableslayer.com/my-party/session/1?debug=query

# Enable fog timing logs
https://tableslayer.com/my-party/session/1?debug=fogtiming
```

### What Gets Logged

#### `?debug=scene`

**Scene switching and navigation:**

```
[scene] Scene switch { from: "scene-1-id", to: "scene-2-id", isInitialLoad: false, timestamp: 1234567890 }
[scene] Scene order mismatch detected: { yjsOrder: 1, selectedSceneNumber: 2, ... }
[scene] AUTO-NAVIGATION from order mismatch { from: 2, to: 1, targetPath: "/party/session/1", ... }
```

**Use cases:**

- Debugging unwanted navigation loops
- Tracking scene order synchronization
- Investigating Y.js drift issues

#### `?debug=query`

**Query lifecycle:**

```
[query] Creating timestampsQuery { gameSessionId: "...", partyId: "...", timestamp: 1234567890 }
```

**Use cases:**

- Verifying query is created only once
- Debugging query recreation issues
- Tracking query refetch behavior

#### `?debug=fogtiming`

**Fog of war round-trip performance:**

```
[FOG-RT] fog_123 - 1. Fog update triggered in editor
[FOG-RT] fog_123 - 2. Starting RLE encoding
...
[FOG-RT] fog_123 - 14. Fog mask applied successfully
[FOG-RT] fog_123 - COMPLETE: Full round-trip completed
```

**Use cases:**

- Performance profiling fog updates
- Identifying slow network or database operations
- Debugging RLE encoding/decoding issues

### Performance Impact

All debug logging functions check the query parameter before logging:

```typescript
export function prodLog(category: string, message: string, data?: any): void {
  if (!browser) return;

  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');

  // Only log if debug enabled
  if (dev || debugParam === 'all' || debugParam === category) {
    console.log(`[${category}] ${message}`, data);
  }
}
```

**Performance characteristics:**

- Query parameter check: ~0.001ms
- No logging overhead when disabled
- Logs only to browser console (not sent to server)
- Safe for production use

## Common Debug Scenarios

### Scenario 1: Scene Switch Navigation Loop

**Symptoms:**

- User clicks to switch to scene 2
- Page briefly shows scene 2
- Page immediately navigates back to scene 1

**Debug approach:**

1. **Enable scene logs:**

   ```
   ?debug=scene
   ```

2. **Look for AUTO-NAVIGATION logs:**

   ```
   [scene] Scene switch { from: "scene-1", to: "scene-2", ... }
   [scene] AUTO-NAVIGATION from order mismatch { from: 2, to: 1, ... }
   ```

3. **Root cause:**
   - Y.js has stale scene order data
   - Navigation effect detects mismatch and forces navigation back

4. **Solution:**
   - Check Y.js synchronization status
   - Verify scene order in database matches Y.js
   - Review scene reordering logic

### Scenario 2: Query Recreation Issue

**Symptoms:**

- Performance degradation
- Unexpected re-fetches
- Race conditions with query state

**Debug approach:**

1. **Enable query logs:**

   ```
   ?debug=query
   ```

2. **Count query creation logs:**

   ```
   [query] Creating timestampsQuery { ... }
   ```

3. **Expected vs actual:**
   - **Expected:** One log per page load
   - **Problem:** Multiple logs during scene switches

4. **Solution:**
   - Verify query is wrapped in `untrack()`
   - Check for reactive dependencies causing recreation

### Scenario 3: Slow Fog Updates

**Symptoms:**

- Long delay between drawing fog and it appearing for other players
- Players see stuttering or lag

**Debug approach:**

1. **Enable fog timing logs:**

   ```
   ?debug=fogtiming
   ```

2. **Analyze timing logs:**

   ```
   [FOG-RT] fog_123 - 3. RLE encoding complete (7889 bytes) // Should be <50ms
   [FOG-RT] fog_123 - 6. Database save complete // Should be <100ms
   [FOG-RT] fog_123 - 12. Fog mask API response received // Network latency
   ```

3. **Identify bottlenecks:**
   - RLE encoding > 100ms: Large canvas size issue
   - Database save > 500ms: Database connection issue
   - API response > 500ms: Network or CDN issue

4. **Solutions:**
   - Optimize canvas resolution
   - Check database connection pool
   - Review CDN configuration

### Scenario 4: Y.js Drift Detection

**Symptoms:**

- Data in Y.js doesn't match database
- Periodic "Syncing data" toasts
- Unexpected data resets

**Debug approach:**

1. **Enable scene and save logs:**

   ```
   ?debug=all
   ```

2. **Check console for drift detection:**

   ```javascript
   // Look for these patterns in existing devLog calls
   [save] Error checking for drift: ...
   [scene] Y.js scene data check: { hasExistingData: true, ... }
   ```

3. **Root cause:**
   - Database timestamp newer than Y.js timestamp
   - Save operation failed but Y.js updated
   - Multiple editors with stale connections

## Performance Monitoring

### Browser DevTools Integration

All debug logs work seamlessly with browser DevTools:

**Filter by category:**

```javascript
// Chrome DevTools Console > Filter
/^\[scene\]/     // Only scene logs
/^\[query\]/     // Only query logs
/^\[FOG-RT\]/    // Only fog timing logs
```

**Copy logs for analysis:**

```javascript
// Right-click in console > Save as...
// Or use Console API
copy(console.history);
```

### Automated Monitoring

For automated monitoring, query parameters can be passed programmatically:

```typescript
// Temporarily enable debug logs
const url = new URL(window.location.href);
url.searchParams.set('debug', 'scene');
window.history.replaceState({}, '', url);

// Later, disable
url.searchParams.delete('debug');
window.history.replaceState({}, '', url);
```

## Best Practices

### 1. Use Appropriate Categories

Match the category to the system being debugged:

```typescript
// ✅ Good
prodLog('query', 'Creating query', { ... });
prodLog('scene', 'Scene switch', { ... });

// ❌ Avoid
prodLog('general', 'Something happened', { ... });
prodLog('debug', 'Log message', { ... });
```

### 2. Include Timestamps

Always include timestamps for timing-sensitive debugging:

```typescript
prodLog('scene', 'Scene switch', {
  from: previousSceneId,
  to: currentSceneId,
  timestamp: Date.now() // Include timestamp
});
```

### 3. Structured Data

Pass structured data objects instead of strings:

```typescript
// ✅ Good
prodLog('query', 'Creating query', {
  gameSessionId,
  partyId,
  timestamp: Date.now()
});

// ❌ Avoid
prodLog('query', `Creating query for ${gameSessionId}`);
```

### 4. Development vs Production

Use `devLog` for verbose development debugging:

```typescript
// Development only (noisy)
devLog('markers', 'Marker hover', { position: { x, y } });

// Production safe (important events only)
prodLog('scene', 'AUTO-NAVIGATION detected', { from, to });
```

### 5. Remove Debug Logs Before Commit

Remove temporary debug logs before committing:

```typescript
// ❌ Don't commit
console.log('DEBUG:', value);
console.log('TODO: investigate this');

// ✅ Use proper debug functions
devLog('markers', 'Marker updated', { id, position });
```

## Related Documentation

- [Y.js Sync Architecture](./yjs-sync-architecture.md) - Details on Y.js synchronization
- [Grid System Architecture](./grid-system-architecture.md) - Grid and measurement systems

## Future Enhancements

Planned debug improvements:

1. **Debug Dashboard**: In-app UI for toggling debug categories
2. **Log Aggregation**: Send production logs to error tracking service
3. **Performance Tracing**: Detailed performance metrics for all operations
4. **Network Inspector**: Visualize Y.js and API network traffic
