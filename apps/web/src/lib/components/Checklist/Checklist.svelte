<script lang="ts">
  import { Button, Icon } from '@tableslayer/ui';
  import { IconX, IconCircleCheck } from '@tabler/icons-svelte';
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

  const isAllComplete = $derived(completedCount === checklistItems.length);

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
      <h3 class="checklist__title">Learn the features</h3>
      <span class="checklist__progress">{completedCount} / {checklistItems.length}</span>
    </div>
    <button type="button" class="checklist__closeButton" onclick={onDismiss} aria-label="Dismiss checklist">
      <Icon Icon={IconX} size="1rem" />
    </button>
  </div>

  {#if isAllComplete}
    <div class="checklist__complete">
      <Icon Icon={IconCircleCheck} size="2rem" />
      <p class="checklist__completeText">You've completed the tour!</p>
      <Button variant="ghost" size="sm" onclick={onDismiss}>Dismiss</Button>
    </div>
  {:else}
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
  {/if}

  <div class="checklist__footer">
    <p class="checklist__footerText">
      Check off items as you explore. You can always access this tour from the help button.
    </p>
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

  .checklist__complete {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    color: var(--fgPrimary);
  }

  .checklist__completeText {
    margin: 0;
    font-size: 0.875rem;
    color: var(--fg);
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
