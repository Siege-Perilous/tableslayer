<script lang="ts">
  import { Icon } from '@tableslayer/ui';
  import { IconChevronDown, IconChevronRight, IconCheck } from '@tabler/icons-svelte';
  import type { ChecklistItem } from './checklistItems';
  import type { Component } from 'svelte';

  type Props = {
    item: ChecklistItem;
    isCompleted: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onToggleComplete: () => void;
  };

  let { item, isCompleted, isExpanded, onToggleExpand, onToggleComplete }: Props = $props();

  const Instructions: Component = item.instructions;
</script>

<div
  class="checklistItem"
  class:checklistItem--completed={isCompleted}
  data-testid="checklistItem"
  data-item-id={item.id}
>
  <div class="checklistItem__header">
    <button
      type="button"
      class="checklistItem__checkbox"
      class:checklistItem__checkbox--checked={isCompleted}
      onclick={onToggleComplete}
      aria-label={isCompleted ? `Mark "${item.title}" as incomplete` : `Mark "${item.title}" as complete`}
      data-testid="checklistItemCheckbox"
    >
      {#if isCompleted}
        <Icon Icon={IconCheck} size="0.875rem" />
      {/if}
    </button>
    <button type="button" class="checklistItem__title" onclick={onToggleExpand} data-testid="checklistItemTitle">
      <span class="checklistItem__titleText">{item.title}</span>
      <span class="checklistItem__caret" class:checklistItem__caret--expanded={isExpanded}>
        <Icon Icon={isExpanded ? IconChevronDown : IconChevronRight} size="1rem" />
      </span>
    </button>
  </div>
  {#if isExpanded}
    <div class="checklistItem__content">
      <Instructions />
    </div>
  {/if}
</div>

<style>
  .checklistItem__header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0;
  }

  .checklistItem__checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border: var(--borderThin);
    border-radius: var(--radius-2);
    background: var(--inputBg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .checklistItem__checkbox:hover {
    border-color: var(--fgPrimary);
  }

  .checklistItem__checkbox--checked {
    background: var(--fgPrimary);
    border-color: var(--fgPrimary);
    color: var(--bg);
  }

  .checklistItem__title {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--fg);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    padding: 0;
  }

  .checklistItem__title:hover {
    color: var(--fgPrimary);
  }

  .checklistItem__titleText {
    flex: 1;
  }

  .checklistItem__caret {
    color: var(--fgMuted);
    display: flex;
    align-items: center;
  }

  .checklistItem__caret--expanded {
    color: var(--fg);
  }

  .checklistItem--completed .checklistItem__titleText {
    color: var(--fgMuted);
  }

  .checklistItem__content {
    padding: 0 0 1rem 2rem;
  }

  :global(.checklist__instructions) {
    font-size: 0.8125rem;
    color: var(--fgMuted);
    line-height: 1.5;
    margin: 0;
  }

  :global(.checklist__instructions strong) {
    color: var(--fg);
  }
</style>
