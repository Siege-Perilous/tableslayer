# Playwright testing guide

This guide covers how to write and run Playwright end-to-end tests for Table Slayer.

## Overview

The Playwright test suite is located in `apps/web/tests/e2e/`. Tests are split into two categories:

- **Authenticated tests** (`*.auth.test.ts`) - Run with pre-authenticated state
- **Unauthenticated tests** (`*.test.ts`) - Run without authentication

## Running tests

```bash
# Run all tests
pnpm run test:integration

# Run only authenticated tests
pnpm exec playwright test --project=authenticated

# Run a specific test file
pnpm exec playwright test tests/e2e/party.auth.test.ts

# Run in headed mode (see the browser)
pnpm exec playwright test --headed

# Run with debug mode
pnpm exec playwright test --debug
```

## Authentication pattern

### How it works

1. `global.setup.ts` runs before all tests
2. It creates a test user via the signup flow
3. Auth state (cookies, localStorage) is saved to `tests/e2e/.auth/user.json`
4. Authenticated tests load this state automatically

### Writing authenticated tests

Name your file with `.auth.test.ts` suffix:

```typescript
// tests/e2e/my-feature.auth.test.ts
import { test, expect } from '@playwright/test';

test('should do authenticated thing', async ({ page }) => {
  // User is already logged in - no need to sign in
  await page.goto('/dashboard');
  // ...
});
```

### Writing unauthenticated tests

Use regular `.test.ts` suffix:

```typescript
// tests/e2e/landing.test.ts
import { test, expect } from '@playwright/test';

test('should show login button to anonymous users', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Sign in')).toBeVisible();
});
```

## Common patterns

### Handling SvelteKit hydration

SvelteKit forms require hydration before they work properly. Always wait for network idle and add a small delay:

```typescript
await page.goto('/some-page');
await page.waitForLoadState('networkidle');

// Click then fill pattern helps ensure hydration
const input = page.getByTestId('myInput');
await input.click();
await input.fill('value');

// Small wait before submit for form binding
await page.waitForTimeout(300);
await page.getByTestId('submitButton').click();
```

### Using test IDs

Prefer `data-testid` attributes for reliable selection:

```svelte
<!-- In component -->
<input data-testid="partyName" bind:value={name} />
<button data-testid="createPartySubmit">Create</button>
```

```typescript
// In test
await page.getByTestId('partyName').fill('My Party');
await page.getByTestId('createPartySubmit').click();
```

### Waiting for URL changes

```typescript
// Wait for navigation away from current page
await page.waitForURL((url) => !url.pathname.includes('create-party'), {
  timeout: 15000
});

// Or wait for specific URL
await page.waitForURL('**/dashboard');
```

### Polling for async operations

Use `toPass()` for operations that take variable time:

```typescript
// Wait for scene count to change
await expect(async () => {
  const count = await page.locator('.scene__list .scene').count();
  expect(count).toBe(expectedCount);
}).toPass({ timeout: 15000 });
```

### Canvas interactions (ThreeJS/Konva)

For interacting with canvas elements:

```typescript
const canvas = page.locator('canvas').first();
const canvasBox = await canvas.boundingBox();
if (!canvasBox) throw new Error('Canvas not found');

// Click in center of canvas
await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
```

### Handling hidden elements

Some elements (like hover-only icons) need JavaScript to make visible:

```typescript
await page.evaluate(() => {
  const icon = document.querySelector('.my-hidden-icon');
  if (icon) (icon as HTMLElement).style.opacity = '1';
});
await page.waitForTimeout(100);
await page.locator('.my-hidden-icon').click();
```

### Context menus and popovers

```typescript
// Right-click to open context menu
await element.click({ button: 'right' });

// Wait for menu to appear
await page.waitForSelector('.menuItem', { state: 'visible', timeout: 5000 });

// Click menu item by text
await page.locator('.menuItem').filter({ hasText: 'Delete' }).click();
```

## Test structure

### Helper functions

Create helpers for common setup operations:

```typescript
async function createPartyAndSession(page: Page): Promise<{
  partySlug: string;
  sessionSlug: string;
}> {
  const partyName = `Test ${Date.now()}`;

  // Create party
  await page.goto('/create-party');
  await page.waitForLoadState('networkidle');
  // ... rest of setup

  return { partySlug, sessionSlug };
}
```

### Test organization

For **non-stage tests** (pages without ThreeJS/GPU rendering), use parallel tests:

```typescript
test.describe('Feature CRUD operations', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should create a feature', async ({ page }) => {
    // Happy path
  });

  test('should update a feature', async ({ page }) => {
    // Happy path
  });

  test('should delete a feature', async ({ page }) => {
    // Happy path
  });

  test('should show error for invalid input', async ({ page }) => {
    // Negative case
  });
});
```

### Linear tests for stage-based pages

For **stage-based tests** (scene editor, markers, etc.), use a single linear test that performs the full workflow. The ThreeJS canvas takes 15-20 seconds to initialize the GPU on GitHub CI runners. Running separate tests would multiply this overhead significantly.

```typescript
test.describe('Scene CRUD operations', () => {
  // Increase timeout for GPU initialization + all operations
  test.setTimeout(150000);

  test('should perform full workflow: create, rename, duplicate, delete', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // --- STEP 1: Verify initial state ---
    // ...

    // --- STEP 2: Create ---
    // ...

    // --- STEP 3: Rename ---
    // ...

    // --- STEP 4: Delete ---
    // ...
  });
});
```

**Why linear tests for the stage?**

- GPU initialization happens once per page load (~15-20s on CI)
- Separate tests = separate page loads = multiplied wait times
- A 5-test suite would take 75-100s just for GPU init
- Linear approach: load once, test everything, total time ~30-40s

**When to use linear vs parallel:**

| Test type                                | Pattern                      | Example files                                                    |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| Non-stage pages                          | Parallel, separate tests     | `party.auth.test.ts`                                             |
| Stage pages (scenes, markers, playfield) | Linear, single workflow test | `scene.auth.test.ts`, `marker.auth.test.ts`, `play.auth.test.ts` |

## File structure

```
apps/web/tests/e2e/
├── .auth/
│   └── user.json          # Auto-generated auth state (gitignored)
├── fixtures/
│   └── test-image.png     # Test assets
├── helpers/
│   └── test-helpers.ts    # Shared helper functions
├── global.setup.ts        # Auth setup, runs before all tests
├── party.auth.test.ts     # Party CRUD tests (parallel)
├── game-session.auth.test.ts
├── scene.auth.test.ts     # Scene CRUD tests (linear, stage-based)
├── marker.auth.test.ts    # Marker CRUD tests (linear, stage-based)
├── play.auth.test.ts      # Playfield tests (linear, stage-based)
├── invite.auth.test.ts
└── test-results.json      # Test output (gitignored)
```

## Adding new test files

1. Determine if tests need auth (use `.auth.test.ts` suffix if yes)
2. Create helper functions for repeated setup
3. Write happy path tests first
4. Add one negative case per feature
5. Run and fix before committing

## Debugging tips

### Use headed mode

```bash
pnpm exec playwright test --headed --timeout=0
```

### Use Playwright inspector

```bash
pnpm exec playwright test --debug
```

### Add pauses

```typescript
await page.pause(); // Opens inspector at this point
```

### Check test results JSON

Test output is saved to `tests/e2e/test-results.json` for debugging failures.

## CI considerations

### How tests run in CI

- Tests run via `pnpm run test` which includes `test:integration`
- CI deploys a preview app to Fly.io per PR
- Tests run against the preview URL (set via `PLAYWRIGHT_BASE_URL`)
- Each PR gets an isolated Turso database

### GPU/Stage loading on CI runners

GitHub CI runners don't have dedicated GPUs, which means ThreeJS canvas initialization is slow (15-20 seconds per page load). To avoid excessive test times:

- **Stage-based tests use linear workflows** - See "Linear tests for stage-based pages" above
- **Timeouts are extended** - Stage tests use `test.setTimeout(150000)` (2.5 minutes)
- **Non-stage tests run in parallel** - Pages without ThreeJS can use separate tests

### Test data isolation

- Each test run creates unique data using `Date.now()` in names
- Tests are isolated by unique party/session names
- No cleanup is needed as preview databases are ephemeral

### Auth state in CI

- `global.setup.ts` creates a fresh test user for each CI run
- The test user email uses `Date.now()` to avoid conflicts
- Auth state is saved to `.auth/user.json` (gitignored)

### Browser installation

CI caches Playwright browsers. If you add new browser requirements, CI will install them automatically via `pnpm exec playwright install`.
