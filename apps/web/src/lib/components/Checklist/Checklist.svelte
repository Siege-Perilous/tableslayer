<script lang="ts">
  import { Icon, Text } from '@tableslayer/ui';
  import { IconX } from '@tabler/icons-svelte';
  import ChecklistItem from './ChecklistItem.svelte';
  import { checklistItems, type ChecklistItemId } from './checklistItems';

  type Props = {
    completedItems: string[];
    onComplete: (itemId: ChecklistItemId) => void;
    onDismiss: () => void;
  };

  let { completedItems, onComplete, onDismiss }: Props = $props();

  let expandedItemId = $state<ChecklistItemId | null>(null);

  const completedCount = $derived(checklistItems.filter((item) => completedItems.includes(item.id)).length);

  const handleToggleExpand = (itemId: ChecklistItemId) => {
    expandedItemId = expandedItemId === itemId ? null : itemId;
  };

  const handleToggleComplete = (itemId: ChecklistItemId) => {
    onComplete(itemId);
  };
</script>

<div class="checklist">
  <div class="checklist__header">
    <div class="checklist__headerContent">
      <h3 class="checklist__title">Learn Table Slayer in 5 minutes</h3>
      <span class="checklist__progress">{completedCount} / {checklistItems.length}</span>
    </div>
    <button type="button" class="checklist__closeButton" onclick={onDismiss} aria-label="Dismiss checklist">
      <Icon Icon={IconX} size="1rem" />
    </button>
  </div>

  <div class="checklist__items">
    {#each checklistItems as item (item.id)}
      <ChecklistItem
        {item}
        isCompleted={completedItems.includes(item.id)}
        isExpanded={expandedItemId === item.id}
        onToggleExpand={() => handleToggleExpand(item.id)}
        onToggleComplete={() => handleToggleComplete(item.id)}
      />
    {/each}
  </div>

  <div class="checklist__footer">
    <p class="checklist__footerText">You can access this at any time by clicking the learn button.</p>
  </div>
</div>

<style>
  .checklist {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg);
  }

  .checklist__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: var(--borderThin);
  }

  .checklist__headerContent {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .checklist__title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  .checklist__progress {
    font-size: 0.75rem;
    color: var(--fgMuted);
    background: var(--contrastLow);
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-2);
  }

  .checklist__closeButton {
    background: none;
    border: none;
    color: var(--fgMuted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-2);
    transition: all 0.15s ease;
  }

  .checklist__closeButton:hover {
    color: var(--fg);
    background: var(--contrastLow);
  }

  .checklist__items {
    flex: 1;
    overflow-y: auto;
    padding: 0 1rem;
  }

  .checklist__footer {
    padding: 1rem;
    border-top: var(--borderThin);
  }

  .checklist__footerText {
    margin: 0;
    font-size: 0.75rem;
    color: var(--fgMuted);
    line-height: 1.4;
  }
</style>
