<script>
  import { IconKeyboard } from '@tabler/icons-svelte';
  import { Icon, Button, Hr, Popover } from '@tableslayer/ui';

  const shortcuts = [
    { label: 'Brush size', shortcut: 'Mouse wheel' },
    { label: 'Erase brush', shortcut: 'E' },
    { label: 'Add brush', shortcut: 'Shoft + E' },
    { divider: true },
    { label: 'Erase rectangle', shortcut: 'R' },
    { label: 'Add rectangle', shortcut: 'Shift + R' },
    { label: 'Erase ellipse', shortcut: 'O' },
    { label: 'Add ellipse', shortcut: 'Shift + O' },
    { divider: true },
    { label: 'Clear fog', shortcut: 'F' },
    { label: 'Reset fog', shortcut: 'Shift + F' },
    { divider: true },
    { label: 'Scale map', shortcut: 'Shift + Mouse wheel' },
    { label: 'Pan map', shortcut: 'Shift + Mouse drag' },
    { divider: true },
    { label: 'Zoom scene', shortcut: 'Ctrl + Mouse wheel' },
    { label: 'Pan scene', shortcut: 'Ctrl + Mouse drag' }
  ];
</script>

<div class="shortcut">
  <Popover>
    {#snippet trigger()}
      <Button variant="ghost">
        {#snippet start()}
          <Icon Icon={IconKeyboard} size="1.5rem" />
        {/snippet}
        Shortcuts
      </Button>
    {/snippet}
    {#snippet content()}
      <ul class="shortcut__list">
        {#each shortcuts as { label, shortcut, divider }}
          {#if divider}
            <li class="shortcut__listDivider">
              <Hr />
            </li>
          {:else}
            <li class="shortcut__listItem">
              <div>{label}</div>
              <span class="shortcut__key">{shortcut}</span>
            </li>
          {/if}
        {/each}
      </ul>
    {/snippet}
  </Popover>
</div>

<style>
  .shortcut {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    z-index: 1;
  }
  .shortcut__listItem {
    display: flex;
    justify-content: space-between;
    gap: 4rem;
    padding: 0.5rem;
    white-space: nowrap;
  }
  .shortcut__listDivider {
    padding: 0.5rem 0;
  }
  .shortcut__listItem:hover {
    background: var(--contrastLow);
  }
  .shortcut__key {
    color: var(--fgMuted);
    font-family: var(--font-mono);
    font-size: 0.875rem;
  }

  @container stageWrapper (max-width: 768px) {
    .shortcut {
      display: none;
    }
  }
</style>
