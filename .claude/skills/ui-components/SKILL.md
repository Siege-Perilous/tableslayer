---
name: ui-components
description: Conventions for building/editing components in packages/ui (@tableslayer/ui) — file anatomy, Svelte 5 props/snippets patterns, BEM + CSS token styling, theming, toast/popover gotchas, and how to visually verify changes in apps/docs. Load whenever creating or modifying anything under packages/ui.
---

# @tableslayer/ui component conventions

> **Freshness**: last verified 2026-07-04 against `@tableslayer/ui` v0.2.2, Svelte 5.56.
> Anchor files are listed at the bottom — if one is missing or looks different, the code wins; update this skill (see "Keeping this skill current").

## Component anatomy (canonical skeleton)

Every component is a PascalCase folder under `packages/ui/src/lib/components/<Name>/` with exactly this layout:

```
<Name>/
  <Name>.svelte    # implementation
  types.ts         # exported prop types
  index.ts         # barrel: component + types
```

`types.ts` — local shape intersected with native element attributes:

```ts
import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';

type _NameProps = {
  children: Snippet; // main content
  start?: Snippet; // optional named slots as snippets
  size?: 'sm' | 'md' | 'lg'; // variation = string unions → BEM modifiers
  isOpen?: boolean; // two-way state → $bindable
  onIsOpenChange?: (open: boolean) => void; // callback convention: on<Thing>Change
};
export type NameProps = _NameProps & HTMLButtonAttributes;
```

`<Name>.svelte` (the `@component` JSDoc block in real components includes a fenced `@example` — omitted here to keep this file's fencing simple):

```svelte
<script lang="ts">
  import type { NameProps } from './types';
  let { children, start, size = 'md', isOpen = $bindable(false), onIsOpenChange, ...restProps }: NameProps = $props();

  let classes = $derived(['name', `name--${size}`, restProps.class ?? '']);
</script>

<!--
@component
  ## Name — one-line description, plus an @example block (see Button.svelte)
-->
<button {...restProps} class={classes}>
  {#if start}{@render start()}{/if}
  <span class="name__label name__label--{size}">{@render children()}</span>
</button>

<style>
  :global(.light) {
    --name-bg: var(--contrastEmpty);
  }
  :global(.dark) {
    --name-bg: var(--bg);
  }
  /* BEM: .block__element--modifier, camelCase inside each segment */
  .name {
    background: var(--name-bg);
    padding: 0 0.5rem;
    border-radius: var(--radius-2);
  }
  .name--sm {
    height: 1.5rem;
  }
  .name__label {
    display: flex;
    gap: 0.5rem;
  }
  .name__label--sm {
    font-size: 0.875rem;
  }
</style>
```

`index.ts`:

```ts
export { default as Name } from './Name.svelte';
export * from './types';
```

Then register it: add `export * from './<Name>';` to `packages/ui/src/lib/components/index.ts`.

Rules baked into the above:

- Single `$props()` destructure with defaults; collect `...restProps` and spread onto the root element. Merge `restProps.class` into the derived class array.
- No `createEventDispatcher` — Svelte 5 callback props only. Native handlers pass through restProps; custom callbacks are named `on<Thing>Change` (`onIsOpenChange`, `onSelectedChange`, `onUpdate`).
- Two-way state uses `$bindable` (Popover `isOpen`, ColorPicker `hex`, Editor `content`).
- Snippets may take params, and trigger snippets receive spreadable props: `trigger: Snippet<[{ triggerProps: { onclick } }]>` — consumer spreads `triggerProps` onto their element. See `Popover.svelte` / `ConfirmActionButton`.
- Polymorphic elements use a props union (`(_Props & HTMLButtonAttributes) | (_Props & HTMLAnchorAttributes)`) + `<svelte:element this={component}>` derived from `as`/`href` (see `Button.svelte`).
- The `@component` JSDoc block in markup is not decoration — typedoc consumes `dist/index.d.ts` to generate the props tables in the docs app. Keep `@example` accurate.

## Styling

- **BEM is required**, scoped per component `<style>`: `.block__element--modifier` with camelCase inside each segment — `.btn`, `.btn--danger`, `.toast__title`, `.toast__titleDot--info`. Block = the component name; every sub-part gets a `__element` class rather than descendant selectors.
- **Spacing, dimensions, and font sizes use plain rem values** (`0.5rem`, `1.5rem`, `0.875rem`…). The `--size-*` and `--font-size-*` scales still exist in `vars.css` but component code no longer uses them (migrated to rem 2026-07) — don't introduce them into new code.
- **Colors must come from tokens** — no hardcoded color values. Semantic theme tokens (`--fg`, `--bg`, `--fgPrimary`, `--fgMuted`, `--fgDanger`, `--inputBg`…) live in `globals.css`; color scales, `--radius-*`, `--shadow-*`, and font weight/line-height tokens in `packages/ui/src/lib/styles/vars.css` remain in active use.
- **Theming is class-based, not media-query-based.** `.light` / `.dark` classes on an ancestor set the semantic vars (`mode-watcher` toggles them on `<html>` in apps). Component-specific theme vars are declared as `:global(.light) { --btn-bg: … }` / `:global(.dark) { … }` inside the component's own style block.
- Variation is expressed as `variant`/`size` string-union props mapped to BEM modifiers — there is no style-object prop API.

## Non-obvious wrappers & subsystem gotchas

- **Toast**: module-level singleton (`Toast/toastStore.svelte.ts` exports `toastManager`, `addToast`, `removeToast`) — NOT context. A `<Toast />` container must be mounted exactly once near the app root; it self-portals to a `#toast-portal` div on `document.body`. Cookie-driven toasts (`toastCookie.ts`) survive navigation.
- **Popover**: `@floating-ui/dom`; `trigger`/`content` snippets; `portal` prop is **opt-in** (`'body'` or selector) to escape `overflow:hidden` clipping — default renders inline. Outside-click closing is a `<svelte:window onclick>`.
- **Icon**: pass a Tabler component as a prop — `<Icon Icon={IconCheck} size="1.25rem" />` (`@tabler/icons-svelte`). No provider.
- **ColorMode**: wrapper that applies `.light`/`.dark` to a subtree (`<svelte:element this={as} class={mode}>`) — used by docs to render both themes side by side.
- **Editor**: TipTap 3, `content` is `$bindable` JSONContent; it's a single-file exception (props typed inline, no types.ts).
- **Form inputs**: `FormControl` is the label/error wrapper around `Input` et al.; theme via `--inputBg`/`--inputFocusBg`/`--inputBorderColor`.

## Verifying a change visually

No Storybook — the demo environment is `apps/docs` (SvelteKit), one route per component at `apps/docs/src/routes/(components)/<name>/+page.svelte`; nav in its `+layout.svelte`.

```bash
pnpm --filter @tableslayer/ui dev   # svelte-package --watch (rebuilds dist for workspace consumers)
pnpm --filter docs dev              # docs app
```

Each demo page uses the `Example` wrapper (apps/docs/src/lib/components/Example/) which renders the demo **twice — light and dark side by side**. Always check both. New components need a docs route + nav entry.

## Publishing (reminder of CLAUDE.md CS rules)

Any change under `packages/ui/` requires a changeset (`pnpm changeset`, select `@tableslayer/ui`). Build artifact is `dist/` via svelte-package; typedoc runs in the `package` script.

## Anchor files (freshness check)

- `packages/ui/src/lib/components/Button/Button.svelte` — canonical complex component
- `packages/ui/src/lib/components/Icon/Icon.svelte` — canonical simple component
- `packages/ui/src/lib/components/index.ts` — component registry barrel
- `packages/ui/src/lib/styles/globals.css` + `vars.css` — tokens/theming
- `packages/ui/src/lib/components/Toast/toastStore.svelte.ts` — singleton toast pattern
- `apps/docs/src/lib/components/Example/Example.svelte` — dual-theme demo wrapper

## Keeping this skill current

If you (Claude) find this document contradicting the code, trust the code, then update this file in the same PR. When a change alters a pattern documented here (new component conventions, theming mechanism, demo workflow), updating this skill is part of the change.
